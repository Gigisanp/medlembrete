# Testes de ponta a ponta (Maestro)

Fluxos dos caminhos principais da fase 1, como pede o CLAUDE.md:
cadastro, aviso, "Já tomei" e "Apagar tudo".

> **Situação:** estes fluxos foram escritos, mas **ainda não foram executados**.
> Na máquina em que foram criados não havia Maestro, simulador, emulador nem aparelho conectado.
> Rode-os num aparelho ou emulador e ajuste os seletores se algum texto não for encontrado.

## Como rodar (Android com Expo Go)

1. Instale o Maestro: https://docs.maestro.dev/getting-started/installing-maestro
2. Conecte um Android com depuração USB (ou abra um emulador) com o Expo Go instalado.
3. No projeto: `npx expo start` e anote o endereço `exp://...` mostrado no terminal.
4. Rode todos os fluxos, na ordem:

   ```sh
   maestro test -e EXPO_URL=exp://SEU_IP:8081 .maestro/
   ```

Os fluxos usam `clearState` no Expo Go (`host.exp.exponent`): isso apaga os dados do Expo Go no aparelho de teste.
A mensagem de permissão do sistema muda com o idioma do aparelho; o fluxo tenta "Permitir" e "Allow".
O fluxo de aviso abre a central de notificações do Android; no iPhone esse passo precisa ser feito à mão.
