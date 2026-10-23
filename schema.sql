-- The tables Real Alpha's MCP server reads (src/moments.ts), from Real Alpha's D1 migrations.

CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  show TEXT NOT NULL,
  title TEXT NOT NULL,
  published TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  thumbnail TEXT NOT NULL,
  short INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  length INTEGER,
  first_seen TEXT NOT NULL,
  updated TEXT NOT NULL
, likes INTEGER, hidden TEXT CHECK (hidden IN ('gone', 'kids')));

CREATE TABLE covers (
  video TEXT PRIMARY KEY REFERENCES videos (id),
  title TEXT NOT NULL,
  thumbnail TEXT,
  at TEXT NOT NULL
);

CREATE TABLE segments (
  id TEXT PRIMARY KEY,
  video TEXT NOT NULL REFERENCES videos (id),
  rank INTEGER NOT NULL,
  start REAL NOT NULL,
  "end" REAL NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  takeaways TEXT NOT NULL,
  guest TEXT,
  quote TEXT,
  transcript TEXT NOT NULL CHECK (transcript IN ('show', 'whisper')),
  model TEXT NOT NULL
, lines TEXT, topics TEXT, extra INTEGER NOT NULL DEFAULT 0 CHECK (extra IN (0, 1)), questions TEXT);

CREATE TABLE transcripts (
  video TEXT PRIMARY KEY REFERENCES videos (id),
  source TEXT NOT NULL CHECK (source IN ('show', 'whisper')),
  url TEXT,
  duration REAL,
  file TEXT NOT NULL,
  at TEXT NOT NULL
, lines TEXT);

CREATE TABLE shows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  youtube TEXT,
  channel_id TEXT,
  podcast TEXT,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'paused', 'pending', 'hidden')),
  added TEXT NOT NULL,
  reason TEXT
, gate TEXT CHECK (gate IN ('ai-guest')));

CREATE TABLE hosts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT,
  show TEXT NOT NULL REFERENCES shows (id),
  role TEXT,
  x TEXT,
  wiki TEXT,
  bio TEXT,
  source TEXT,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'pending', 'hidden')),
  added TEXT NOT NULL
, picture TEXT);

CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  blurb TEXT NOT NULL,
  website TEXT NOT NULL,
  x TEXT,
  logo TEXT,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'pending', 'hidden')),
  source TEXT,
  added TEXT NOT NULL
, picture TEXT, reason TEXT, video TEXT);

CREATE TABLE builders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT,
  role TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('founder', 'operator', 'researcher')),
  company TEXT REFERENCES companies (id),
  x TEXT,
  wiki TEXT,
  bio TEXT,
  source TEXT,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'pending', 'hidden')),
  added TEXT NOT NULL
, picture TEXT, reason TEXT, video TEXT);

CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT,
  role TEXT,
  x TEXT,
  wiki TEXT,
  bio TEXT,
  source TEXT,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'pending', 'hidden')),
  added TEXT NOT NULL,
  picture TEXT,
  reason TEXT,
  video TEXT
);

CREATE TABLE lineups (
  video TEXT PRIMARY KEY REFERENCES videos (id),
  model TEXT NOT NULL,
  cost REAL,
  at TEXT NOT NULL
);

CREATE TABLE appearances (
  video TEXT NOT NULL REFERENCES lineups (video),
  position INTEGER NOT NULL,
  part TEXT NOT NULL CHECK (part IN ('guest', 'host')),
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (video, position)
);
