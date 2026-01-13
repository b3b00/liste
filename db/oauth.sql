-- shoppingList definition

CREATE TABLE shoppingList (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
, user_id TEXT);

CREATE INDEX idx_shoppingList_created_at ON shoppingList(created_at);
CREATE INDEX idx_shoppingList_updated_at ON shoppingList(updated_at);

-- users definition

CREATE TABLE users (
	id TEXT,
	email TEXT,
	name TEXT,
	picture TEXT,
	created_at TEXT,
	last_login TEXT
);