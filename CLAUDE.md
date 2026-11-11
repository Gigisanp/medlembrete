# MedLembrete — especificação para o Claude Code

Protótipo de lembrete de medicamentos para idosos com doenças crônicas que usam vários remédios. Projeto da disciplina Tecnologia Aplicada à Saúde I. Objetivo desta fase: transformar o protótipo em um app que funcione de verdade no celular, para testes com usuários.

## Regras de produto (não negociáveis)
- O app NÃO indica medicamentos, NÃO recomenda doses e NÃO altera prescrições.
- A pessoa digita o que a receita indicou: nome, horário e observação livre. Nenhuma dose é calculada ou sugerida pelo app.
- Não há base de medicamentos, bula ou alerta de interação nesta versão.
- Textos de exemplo devem ser fictícios e sinalizados como tal.
- Em qualquer tela de dúvida, o app deve orientar a falar com o médico ou farmacêutico.

## Público e acessibilidade
- Público principal: idosos com pouca familiaridade com tecnologia.
- Texto base de 20 px ou mais, com opção de aumentar a fonte.
- Contraste de texto de pelo menos 4,5:1.
- Botões com área de toque de pelo menos 44 px, com rótulo visível.
- Um botão principal por tela. Evitar gestos complexos, como arrastar ou pressionar e segurar.
- Avisos com som e visual, sem depender só de cor.

## Questionário inicial (primeira abertura)
- Aparece só na primeira abertura, antes da tela de início. Pode ser refeito em Configurações.
- Uma pergunta por tela, com um botão principal e textos grandes.
- Passo 1, idade: número entre 18 e 120. Pode ser pulado. Serve só para sugerir o tamanho inicial da letra: quem tem 60 anos ou mais começa com letra grande. A pessoa pode mudar depois.
- Passo 2, medicamentos: nome de cada medicamento, em texto livre, com botão "Adicionar outro". Pode ser pulado.
- Passo 3, horários: para cada medicamento, um ou mais horários, digitados pela pessoa. O app não sugere horários.
- Observação livre por medicamento é opcional. O questionário não pede dose, e o app não calcula nem sugere nenhuma.
- Resumo antes de salvar: lista os medicamentos e horários, com botão "Confirmar". Ao confirmar, o app salva os dados e agenda os avisos.
- Se a pessoa pular tudo, a tela de início aparece vazia, com o botão "Cadastrar medicamento".
- Textos fixos na tela de resumo: "Estes são os horários que a sua receita indicou. Confira com atenção."
- Todos os dados ficam no aparelho e são apagados pelo botão "Apagar tudo".

## Navegação (abas inferiores)
- O app tem uma barra de abas fixa na parte de baixo, com no máximo 5 abas e rótulos sempre visíveis, com ícone e texto.
- Abas, nesta ordem: **Hoje** (tela de início), **Remédios** (lista e cadastro), **Histórico**, **Ajuda** e **Ajustes**.
- O botão "Cadastrar medicamento" da tela Hoje também abre a aba Remédios.
- Cada aba tem texto de 20 px ou mais e área de toque de pelo menos 44 px.
- A aba ativa aparece com cor e peso de fonte diferentes, e não só pela cor.
- Ajustes tem: tamanho da letra, apagar tudo, e (na fase 2) familiares vinculados.

## Telas (do protótipo)
1. Início: próximo lembrete em destaque, botão "Já tomei" e lista dos próximos horários do dia.
2. Registro: pergunta "Você tomou?" com "Sim, tomei" e "Ainda não". Confirmação "Registro salvo com sucesso".
3. Histórico: dias anteriores com status de cada horário (tomado ou pendente).
4. Ajuda ("Esqueci um horário"): orienta a não tomar dose extra, leva às instruções da receita e tem o botão "Pedir ajuda", que abre o discador com o número de um contato cadastrado (ver seção abaixo).
5. Cadastro de medicamento: nome, horário(s), observação livre. Pode ser editado e removido.

## Comportamento
- Aviso no horário marcado. Se não for confirmado, repete após 10 minutos (padrão), com intervalo configurável.
- "Já tomei" registra a dose com data e hora. "Ainda não" repete o aviso.
- O histórico mostra o que foi confirmado e o que ficou pendente.

## Pedido de ajuda por ligação (fase 1)
- Na tela de ajuda, cadastre um ou mais contatos de ajuda: nome e telefone (familiar, cuidador ou equipe de saúde).
- O botão "Pedir ajuda" abre o discador do telefone com o número do contato. Se houver só um contato, o discador abre direto. Se houver mais de um, o app lista os contatos e abre o discador com o escolhido.
- O app não completa a ligação sozinho. O sistema operacional mostra a tela de chamada e a pessoa confirma.
- Os contatos ficam só no aparelho e são apagados junto com todos os dados pelo botão "Apagar tudo".
- A tela de ajuda mostra sempre: "Em caso de emergência, ligue 192 (SAMU)."
- Funciona sem internet, pois usa só o discador.
- Na fase 2, o mesmo botão também envia o alerta de push ao familiar vinculado (ver fase 2).

## Dados e privacidade
- Dados de saúde são sensíveis. Na versão 1, tudo fica no próprio aparelho (armazenamento local). Não há conta, login nem envio para servidor.
- Não coletar dados pessoais além do necessário: nome do medicamento e horários.
- Permitir apagar todos os dados a qualquer momento.
- Não enviar dados para terceiros nem usar analytics de terceiros.

## Stack (app nativo)
- Expo com React Native e TypeScript. Teste no celular com Expo Go antes de gerar build.
- Navegação com Expo Router.
- Armazenamento local com expo-sqlite (dados ficam só no aparelho).
- Lembretes com expo-notifications, agendados localmente no horário de cada medicamento. Com isso, o aviso chega mesmo com o app fechado, sem depender de servidor.
- Confirmar a permissão de notificações na primeira abertura e explicar o motivo em texto grande.
- Testes com Jest e React Native Testing Library. Testes de fluxo ponta a ponta com Maestro, nos caminhos principais (cadastro, aviso, "Já tomei", apagar tudo).
- Publicação em lojas fica fora desta fase (exige conta de desenvolvedor da Apple e do Google).

## Entregas em etapas
1. Esqueleto do projeto, roteamento e tema de acessibilidade (fonte, contraste, toque).
2. Cadastro de medicamento com validação e persistência local.
3. Questionário inicial (idade, medicamentos e horários) e tela de início com próximo lembrete e contagem regressiva.
4. Aviso no horário, com repetição de 10 minutos e registro de "Já tomei".
5. Histórico, tela de ajuda e contatos de ajuda com o botão "Pedir ajuda" abrindo o discador.
6. Apagar dados, revisão de acessibilidade e textos fictícios sinalizados.

## Fora do escopo desta fase
- Base de medicamentos, doses, bula ou alerta de interação.
- Login, nuvem, sincronização entre aparelhos e modo familiar: ficam para a fase 2 (abaixo).
- Publicação em lojas de aplicativos.

## Critérios de aceite da fase 1
- Funciona offline depois de instalado.
- Um medicamento cadastrado gera aviso no horário certo, com repetição em 10 minutos se não for confirmado.
- Cada tela tem um botão principal claro e textos legíveis em tamanho grande.
- Os dados somem após "Apagar tudo", inclusive os contatos de ajuda.
- "Pedir ajuda" abre o discador com o número do contato escolhido em um toque, sem internet.
- O questionário inicial salva idade, medicamentos e horários, e cria os avisos ao confirmar. Pular qualquer passo não impede o uso do app.
- Nenhum texto do app sugere dose ou indicação.

## Fase 2 — modo familiar e conexão online

Objetivo: o usuário pode vincular um familiar. O familiar recebe alerta quando o usuário pede ajuda e pode acompanhar a rotina (doses confirmadas e pendentes). A fase 1 continua funcionando offline; a fase 2 só acrescenta sincronização e alertas.

### Vínculo
- O usuário gera um código de convite de uso único (ou QR code), com validade de 24 horas.
- O familiar aceita o convite com o próprio cadastro (e-mail ou telefone, com confirmação).
- O usuário vê a lista de familiares vinculados e pode remover qualquer um a qualquer momento. Remover o vínculo corta o acesso imediatamente.
- Um usuário pode ter vários familiares; cada um pode ter um nível de acesso diferente (ver abaixo).

### O que o familiar vê (padrão mínimo)
- Doses de hoje com status: tomado, pendente ou atrasado, e o horário em que foi confirmado.
- Histórico dos últimos dias, no mesmo formato da tela de histórico.
- Nomes dos medicamentos aparecem por padrão. O usuário pode ocultar os nomes, mantendo só os horários e os status.
- Observações livres do usuário não são compartilhadas, a menos que ele ative essa opção por medicamento.
- O familiar não recebe nenhum botão para alterar cadastro, horário ou registro de dose do usuário.

### Pedir ajuda
- Botão "Pedir ajuda" na tela de ajuda, com grande destaque.
- Ao tocar, o app envia um alerta push a todos os familiares vinculados, com horário, nome do usuário e mensagem curta padrão ("Preciso de ajuda com meus remédios"). Não há texto livre nesta versão.
- O alerta é registrado no histórico do familiar, com data e hora, e pode ser marcado como "vi".
- A tela de ajuda mostra sempre: "Em caso de emergência, ligue 192 (SAMU)." O app não substitui serviço de emergência.

### Alerta automático por atraso (opcional, desligado por padrão)
- Se uma dose ficar pendente após as repetições de aviso, o familiar pode ser avisado. Só ocorre se o usuário ativar a opção.
- O intervalo é configurável pelo usuário. Padrão: 60 minutos após o horário da dose.

### Sincronização e funcionamento offline
- Dados continuam salvos no aparelho primeiro. A sincronização acontece quando houver internet.
- Confirmações de dose feitas offline são enviadas em fila, na ordem em que aconteceram, e não se perdem.
- Os avisos locais continuam funcionando sem internet. O alerta de ajuda para o familiar só é enviado com internet; se não houver conexão, o app avisa o usuário e tenta de novo.

### Stack sugerida para a fase 2 (pode ser trocada)
- Backend: Supabase (Postgres com Row Level Security e autenticação), com regras de acesso que só liberam dados ao familiar vinculado.
- Push: Expo Push Notifications, disparados pelo backend.
- Sincronização: fila local em expo-sqlite com reenvio ao reconectar.

### Segurança e privacidade (obrigatório antes de qualquer teste com usuários reais)
- Dados de saúde são sensíveis na LGPD. Antes de testes reais, a equipe precisa de termo de consentimento escrito, com o que é compartilhado, com quem e como revogar.
- Consentimento do usuário registrado a cada vínculo, com data e versão do termo.
- Criptografia em trânsito (HTTPS) e em repouso no banco.
- Logs e notificações push não podem conter o nome do medicamento nem a dose. A notificação diz só "Pedido de ajuda" e o horário.
- Direito de exclusão: o usuário apaga a conta e todos os dados, incluindo vínculos e histórico, em uma única ação.
- Política de privacidade publicada no app antes de qualquer teste com usuários.
- Revisão jurídica ou de um encarregado de dados (DPO) antes de publicação. Esta especificação não substitui essa revisão.

### Entregas da fase 2
1. Contas e login (e-mail ou telefone) e termo de consentimento.
2. Convite e aceite de familiar, com revogação.
3. Sincronização de doses e histórico, com fila offline.
4. Painel do familiar com status de hoje e histórico.
5. Botão "Pedir ajuda" com push ao familiar e registro de "vi".
6. Alerta automático por atraso (opcional) e revisão de privacidade.

### Critérios de aceite da fase 2
- Um familiar vinculado recebe o pedido de ajuda em menos de 1 minuto quando há internet.
- Remover o vínculo bloqueia imediatamente o acesso do familiar aos dados.
- O familiar vê o status de cada dose do dia, sem poder alterá-la.
- Nenhuma notificação, log ou tela do familiar mostra dose ou observação livre.
- Apagar a conta remove todos os dados do servidor e do aparelho.
