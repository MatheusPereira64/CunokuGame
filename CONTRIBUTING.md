# Contribuindo com o Cunoku

O Cunoku é um projeto **proprietário** (veja o [LICENSE](LICENSE)). Só contribuem pessoas que receberam acesso do titular, Matheus Pereira.

## Direitos sobre as contribuições

Ao enviar um commit, pull request, arte, texto ou qualquer outro material para este repositório, você concorda que:

1. **Cessão de direitos:** os direitos patrimoniais de autor sobre a sua contribuição passam ao titular do projeto, que pode usá-la, modificá-la, publicá-la, licenciá-la e vendê-la livremente, inclusive em versões comerciais e fechadas do jogo, sem pagamento ou outra autorização sua.
2. **Autoria original:** a contribuição é sua, ou você tem o direito de cedê-la, e ela não copia material de terceiros sem licença compatível.
3. **Uso fora do projeto:** você não vai usar o código do Cunoku fora deste repositório, nem publicar cópias dele, sem autorização por escrito do titular.

Seu nome continua no histórico do repositório como autor dos commits.

## Antes de enviar

- Trabalhe na branch `development` (ou numa branch a partir dela); a `main` recebe só o que vai virar versão.
- Rode a verificação de tipos, os testes e o build antes de enviar:

  ```bash
  npx tsc --noEmit
  ```

  ```bash
  npx vitest run
  ```

  ```bash
  npm run build
  ```

- Recursos de terceiros (músicas, sons, imagens, fontes) só entram com a licença e a origem registradas na seção de créditos do README.
