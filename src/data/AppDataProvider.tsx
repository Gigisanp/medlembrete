import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  completeOnboarding as completeOnboardingDb,
  confirmSlot,
  createContact,
  createMedication,
  deleteContact,
  deleteMedication,
  listContacts,
  getSettings,
  listDoseLogsSince,
  listMedications,
  listSnoozesSince,
  markNotificationsAsked as markNotificationsAskedDb,
  saveFontSize,
  saveRepeatMinutes,
  snoozeSlot,
  updateContact,
  updateMedication,
  wipeAllData,
  type Db,
  type Settings,
} from '@/db/repository';
import type { HelpContact, HelpContactInput } from '@/domain/contact';
import {
  addDays,
  dateKey,
  DEFAULT_REPEAT_MINUTES,
  planNotifications,
  type DoseLog,
  type Snooze,
} from '@/domain/doses';
import type { Medication, MedicationInput } from '@/domain/medication';
import {
  cancelAllNotifications,
  getPermission,
  requestPermission,
  SCHEDULE_LIMIT,
  syncScheduledDoses,
  type PermissionState,
} from '@/notifications/service';
import type { FontSizeOption } from '@/theme/tokens';

/** Quantos dias de registros ficam carregados na memória (o histórico mostra 30). O banco guarda tudo. */
const LOG_DAYS = 31;

type Permission = { state: PermissionState; canAskAgain: boolean };

type AppData = {
  ready: boolean;
  settings: Settings;
  medications: Medication[];
  logs: DoseLog[];
  snoozes: Snooze[];
  contacts: HelpContact[];
  permission: Permission;
  /** Cria (sem id) ou atualiza (com id) um medicamento. */
  saveMedication: (input: MedicationInput, id?: number) => Promise<void>;
  removeMedication: (id: number) => Promise<void>;
  completeOnboarding: (payload: { age: number | null; medications: MedicationInput[] }) => Promise<void>;
  setFontSize: (option: FontSizeOption) => void;
  setRepeatMinutes: (minutes: number) => Promise<void>;
  /** "Já tomei": registra todos os medicamentos do horário com data e hora. */
  confirmDose: (date: string, time: string) => Promise<void>;
  /** "Ainda não": repete o aviso daqui a `repeatMinutes`. Devolve o horário do próximo aviso. */
  snoozeDose: (date: string, time: string) => Promise<Date>;
  requestNotificationPermission: () => Promise<Permission>;
  markNotificationsAsked: () => Promise<void>;
  /** Cria (sem id) ou atualiza (com id) um contato de ajuda. */
  saveContact: (input: HelpContactInput, id?: number) => Promise<void>;
  removeContact: (id: number) => Promise<void>;
  /**
   * "Apagar tudo": cancela os avisos e apaga todos os dados locais.
   * Se algo falhar, lança erro e não apaga nada do banco (ou reagenda os avisos, se o banco falhar).
   */
  eraseAll: () => Promise<void>;
};

const AppDataContext = createContext<AppData | null>(null);

const EMPTY_SETTINGS: Settings = {
  onboardingDone: false,
  age: null,
  fontSize: null,
  repeatMinutes: DEFAULT_REPEAT_MINUTES,
  notificationsAsked: false,
};

/** Liga as telas ao banco local (expo-sqlite) e mantém os avisos agendados. Nada sai do aparelho. */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext() as unknown as Db;
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [snoozes, setSnoozes] = useState<Snooze[]>([]);
  const [contacts, setContacts] = useState<HelpContact[]>([]);
  const [permission, setPermission] = useState<Permission>({ state: 'undetermined', canAskAgain: true });
  // Muda quando o app volta para a frente, para reagendar a janela de dias.
  const [foregroundTick, setForegroundTick] = useState(0);

  const reload = useCallback(async () => {
    const since = dateKey(addDays(new Date(), -LOG_DAYS));
    const nextSettings = await getSettings(db);
    const nextMedications = await listMedications(db);
    const nextLogs = await listDoseLogsSince(db, since);
    const nextSnoozes = await listSnoozesSince(db, since);
    const nextContacts = await listContacts(db);
    setSettings(nextSettings);
    setContacts(nextContacts);
    setMedications(nextMedications);
    setLogs(nextLogs);
    setSnoozes(nextSnoozes);
  }, [db]);

  const refreshPermission = useCallback(async () => {
    try {
      setPermission(await getPermission());
    } catch {
      setPermission({ state: 'undetermined', canAskAgain: true });
    }
  }, []);

  // Carga inicial do banco e da permissão. O estado só muda depois da leitura (assíncrona).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await Promise.all([reload(), refreshPermission()]);
      if (!cancelled) setReady(true);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reload, refreshPermission]);

  // Ao voltar para o app: confere a permissão (pode ter mudado nos ajustes) e reagenda.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPermission();
        reload();
        setForegroundTick((t) => t + 1);
      }
    });
    return () => sub.remove();
  }, [refreshPermission, reload]);

  // Sempre que algo muda, os avisos agendados são refeitos a partir do banco.
  useEffect(() => {
    if (!ready || permission.state !== 'granted') return;
    const planned = planNotifications({
      medications,
      logs,
      snoozes,
      now: new Date(),
      repeatMinutes: settings.repeatMinutes,
      limit: SCHEDULE_LIMIT,
    });
    syncScheduledDoses(planned);
  }, [ready, permission.state, medications, logs, snoozes, settings.repeatMinutes, foregroundTick]);

  const saveMedication = useCallback(
    async (input: MedicationInput, id?: number) => {
      if (id == null) await createMedication(db, input);
      else await updateMedication(db, id, input);
      await reload();
    },
    [db, reload],
  );

  const removeMedication = useCallback(
    async (id: number) => {
      await deleteMedication(db, id);
      await reload();
    },
    [db, reload],
  );

  const completeOnboarding = useCallback(
    async (payload: { age: number | null; medications: MedicationInput[] }) => {
      await completeOnboardingDb(db, payload);
      await reload();
    },
    [db, reload],
  );

  const setFontSize = useCallback(
    (option: FontSizeOption) => {
      setSettings((s) => ({ ...s, fontSize: option }));
      saveFontSize(db, option);
    },
    [db],
  );

  const setRepeatMinutes = useCallback(
    async (minutes: number) => {
      setSettings((s) => ({ ...s, repeatMinutes: minutes }));
      await saveRepeatMinutes(db, minutes);
    },
    [db],
  );

  const confirmDose = useCallback(
    async (date: string, time: string) => {
      const slotMeds = medications
        .filter((m) => m.times.includes(time))
        .map((m) => ({ id: m.id, name: m.name }));
      await confirmSlot(db, { date, time, medications: slotMeds, takenAt: new Date() });
      await reload();
    },
    [db, medications, reload],
  );

  const snoozeDose = useCallback(
    async (date: string, time: string) => {
      const until = new Date(Date.now() + settings.repeatMinutes * 60_000);
      await snoozeSlot(db, { date, time, until: until.toISOString() });
      await reload();
      return until;
    },
    [db, reload, settings.repeatMinutes],
  );

  const requestNotificationPermission = useCallback(async () => {
    let next: Permission;
    try {
      next = await requestPermission();
    } catch {
      next = { state: 'denied', canAskAgain: false };
    }
    setPermission(next);
    return next;
  }, []);

  const markNotificationsAsked = useCallback(async () => {
    setSettings((s) => ({ ...s, notificationsAsked: true }));
    await markNotificationsAskedDb(db);
  }, [db]);

  const saveContact = useCallback(
    async (input: HelpContactInput, id?: number) => {
      if (id == null) await createContact(db, input);
      else await updateContact(db, id, input);
      await reload();
    },
    [db, reload],
  );

  const removeContact = useCallback(
    async (id: number) => {
      await deleteContact(db, id);
      await reload();
    },
    [db, reload],
  );

  const eraseAll = useCallback(async () => {
    // 1) Primeiro os avisos: se não der para cancelar, nada é apagado.
    await cancelAllNotifications();
    // 2) Depois os dados, numa transação só.
    try {
      await wipeAllData(db);
    } catch (error) {
      // O banco continua como estava: reagenda os avisos que foram cancelados.
      setForegroundTick((t) => t + 1);
      throw error;
    }
    await reload();
  }, [db, reload]);

  const value = useMemo<AppData>(
    () => ({
      ready,
      settings,
      medications,
      logs,
      snoozes,
      contacts,
      permission,
      saveMedication,
      removeMedication,
      completeOnboarding,
      setFontSize,
      setRepeatMinutes,
      confirmDose,
      snoozeDose,
      requestNotificationPermission,
      markNotificationsAsked,
      saveContact,
      removeContact,
      eraseAll,
    }),
    [
      ready,
      settings,
      medications,
      logs,
      snoozes,
      contacts,
      permission,
      saveMedication,
      removeMedication,
      completeOnboarding,
      setFontSize,
      setRepeatMinutes,
      confirmDose,
      snoozeDose,
      requestNotificationPermission,
      markNotificationsAsked,
      saveContact,
      removeContact,
      eraseAll,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const data = useContext(AppDataContext);
  if (!data) throw new Error('useAppData precisa estar dentro de <AppDataProvider>.');
  return data;
}
