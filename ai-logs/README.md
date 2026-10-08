# AI logs

The full conversation with the AI coding assistant (Claude Code) that I used to build this repository.

[`session.jsonl`](session.jsonl) is the export in the tool's native format: one JSON object per line, with every message, tool call, tool output and the assistant's reasoning, in order. My messages are the entries with `"type": "user"` and text content.

Two edits were made to the file, nothing else was changed, removed or reordered:

- my email address, which the tool attached automatically as account context, is replaced with `[email removed]`;
- a sample API key from a payment provider's public documentation, captured when the assistant read that page, is replaced with `[example key removed]`, so that secret scanners do not flag it.

## Before you read: a note on tone

- **The conversation is in Portuguese**, my first language, and I typed it fast, in the flow of the work. It is full of typos, abbreviations (`vc`, `q`, `td`, `pfv`), capital letters and the occasional "wtf". That is how I write when I am focused, and it was aimed at outputs that drifted from the assignment, never at a person. I asked the assistant to answer in Portuguese; all code and documentation are in English.
- **The short, blunt messages are deliberate.** I treated every proposal as a draft. I made the assistant re-read the assignment before each phase, review its own work against it, prove claims in the code before writing them down, and explain every file so that I could explain it myself.
- **Not every idea of mine was right, and the log shows that too.** When I suggested hiding the score from the table, re-reading the assignment showed the score is a required column, so it stayed. When I asked whether time was being faked in the running app, the answer, checked in the code, was no: only the tests freeze the clock, as the assignment requires.
- **`docs/` and `CLAUDE.md`**, mentioned throughout, were local working files: a copy of the assignment and a short guide that kept the assistant on track between steps. They are not part of the deliverable and are not in the repository.

## Where I steered the tool

Times are UTC and match the `timestamp` field of each entry in `session.jsonl`.

| When | What I wrote (original Portuguese, trimmed) | What changed |
|---|---|---|
| Oct 6, 14:23 | "nao disse que é um projeto de ml, ml é meu nome." | Stopped an early assumption (ML is my name, not machine learning). Nothing would be assumed beyond the assignment. |
| Oct 6, 16:57 | "tudo precisa seguir o documento original SPEC.MD" | Made the assignment the single source of truth. Every later ambiguity was settled by its most literal reading. |
| Oct 6, 17:17 | "vou comitar no git depois. eu que vou fazer isso" | Kept version control in my hands. The assistant never commits. |
| Oct 6, 17:43 | "faça uma revisão de tudo... observando o que o spec pede... o código precisa estar profissional" | A review against the assignment before every new phase, not only at the end. |
| Oct 7, 13:04 | "quando você restart o banco, fica aparecendo cliente que já tá com o pedido pronto... abaixo do ranking" | Rebuilt the demo data so it tells a believable kitchen story: each order in preparation was the top of the queue when it started. |
| Oct 7, 13:59 | "NÃO PODE MOCAR TEMPO! LEU O SPEC?" | Checked that the running app uses the real clock and only the tests freeze it. Confirmed in the code. |
| Oct 7, 14:17 and 14:22 | "acho que pode ser só uma explicação normal, sem botar o cálculo" / "não precisa dos números... só os motivos" | Rejected the score explanation with points and formula text. This is the rewritten suggestion in `DECISIONS.md`. |
| Oct 7, 15:04 | "a header mais de produto e menos de app de IA" | Pushed the screen toward a product a restaurant would buy, not a generic AI-generated layout. |
| Oct 7, 15:40 and 15:41 | "acho que não deveria estar expondo o valor do score no front" / "não vamos descumprir o spec então, segue com o que ele pediu na tela!!" | My own idea, reversed a minute later: the assignment lists the score as a table column, so it stays visible. |
| Oct 7, 16:16 | "sem comentários de IA no código, algo profissional e clean" | Removed narrative comments; kept only short ones that explain why. |
| Oct 7, 18:33 | "não deve falar do nosso processo... isso é coisa só pra gente" | Kept the deliverables about the product, not about how it was made. That belongs here. |
| Oct 7, 18:40 | "Extra points: none attempted...???? o que que o spec fala e o que deixamos de fora?" | Caught a draft that skipped the extras. All three were then built and tested. |
| Oct 7, 19:20 | "pensa você, sendo o contratante para essa vaga, o que você quer ler?" | Rewrote `DECISIONS.md` for its reader: priorities, trade-offs and costs instead of a feature list. |
| Oct 7, 19:38 | "confere pra não escrever coisa errada do projeto, depois pesquise bons motivos" | Every claim in `DECISIONS.md` checked against the code, and each choice backed by a published source. |
| Oct 7, 19:39 | "você se recusou a botar regra de negócio do spec no código????" | Caught wording that could mislead a reader; the heading was made explicit. |
