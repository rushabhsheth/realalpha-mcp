# Real Alpha MCP server

**Ask your AI what AI leaders actually said.** [Real Alpha](https://realalpha.app) cuts the minutes worth hearing from long interviews with the people building AI: founders, CEOs and researchers on shows like Lenny's Podcast, Dwarkesh Podcast, No Priors and BG2. This MCP server lets Claude, ChatGPT, Cursor, VS Code or any other assistant search those moments, and gives every answer the speaker, the show, the date, their own words and the page to cite.

```
https://realalpha.app/mcp
```

Streamable HTTP, read-only, free, with no account and no key. How to add it, step by step: [realalpha.app/mcp](https://realalpha.app/mcp/).

## Add it

- **Claude** (web or desktop): Settings › Connectors › Add custom connector, name it Real Alpha, paste the address.
- **Claude Code:** `claude mcp add --transport http real-alpha https://realalpha.app/mcp`
- **ChatGPT:** Settings › Apps & Connectors › Advanced settings › Developer mode, then Create, paste the address, No authentication.
- **Cursor** (`~/.cursor/mcp.json`):

  ```json
  {
    "mcpServers": {
      "real-alpha": { "url": "https://realalpha.app/mcp" }
    }
  }
  ```

- **VS Code** (`.vscode/mcp.json`):

  ```json
  {
    "servers": {
      "real-alpha": { "type": "http", "url": "https://realalpha.app/mcp" }
    }
  }
  ```

- **A client that only runs local servers:** `npx -y mcp-remote https://realalpha.app/mcp`

## Tools

| Tool | What it does | Ask it |
| --- | --- | --- |
| `search_moments` | Searches every moment by what was said, with filters for who's talking, a company, a show or a date | "What have the people building AI said about the AI bubble?" |
| `what_did_they_say` | Everything one person said in the interviews cut, or only on a topic, with who they are | "What has Jensen Huang said about AI demand?" |
| `answers_to` | How builders answer a big question about AI (a bubble? which jobs? when AGI?), grouped by which way they answer | "Will AI replace software engineers?" |
| `get_moment` | One moment in full: quote, takeaways, topics, the questions it answers, the episode's other best minutes | "Tell me more about that Satya Nadella moment." |
| `transcript_excerpt` | About a minute of an episode's transcript from any second, to check the exact words | "What exactly did he say around 31:50?" |
| `latest_moments` | The newest best minutes, from every show or one | "What did AI leaders say on podcasts this week?" |

Every moment comes back like this, with a `cite` line ready to use:

```json
{
  "title": "Nvidia demand rests on three segments, not two AI labs",
  "speaker": "Jensen Huang",
  "speaker_role": "Founder & CEO, NVIDIA",
  "show": "BG2",
  "date": "2026-10-15",
  "quote": "if you just kind of look at our compute, people see a couple of labs, but I see more than that. I see five, six labs.",
  "starts_at": "1:01:57",
  "url": "https://realalpha.app/s/nvidia-demand-rests-on-three-segments-not-two-ai-labs/",
  "cite": "Jensen Huang on BG2, Oct 15, 2026, via Real Alpha: https://realalpha.app/s/nvidia-demand-rests-on-three-segments-not-two-ai-labs/"
}
```

## How it works

- A Cloudflare Worker with the [Agents SDK](https://developers.cloudflare.com/agents/)'s stateless `createMcpHandler`: a fresh server for each request, no sessions, for clients on the 2025 and 2026-07-28 protocols.
- It reads Real Alpha's D1 database: the moments (`segments`), their episodes and shows, who's in each episode, the people and company directories, and the transcripts of the episodes cut. `schema.sql` has those tables.
- Answers are short excerpts and links: a quote, a summary, or a minute of transcript at most. The whole conversation plays on each moment's page, in the show's own YouTube player.
- It only reads, keeps nothing about who asks, and gives each address 120 requests a minute.

## This repository

This is the code that runs at `https://realalpha.app/mcp`, copied from Real Alpha's site, which serves it beside its pages, each time it changes. `src/mcp.ts` is the server and its tools, `src/moments.ts` what it reads, `src/lib/` the site's helpers they use, and `src/index.ts` runs it as a Worker of its own.

The data is Real Alpha's and isn't here: the moments, transcripts and directories come from Real Alpha's pipeline. To run your own copy on your own data, make a D1 database, apply `schema.sql`, fill it, put its id in `wrangler.jsonc` and run `npm install && npm run deploy`. The links it gives point at realalpha.app's pages: change `src/lib/site.ts` to point them at yours.

Found a wrong answer, or want a tool it doesn't have? Open an issue, or write to hello@realalpha.app.

## License

The code is MIT. What the server returns (quotes, transcripts, summaries) belongs to the shows and the people speaking, and using the hosted server means agreeing to [Real Alpha's terms](https://realalpha.app/terms/).
