import type { CodeSnippet } from "./types";

export type SetupStack = {
  label: string;
  philosophy: string;
  snippets: CodeSnippet[];
};

export const SETUP: { rails: SetupStack; fastapi: SetupStack } = {
  rails: {
    label: "rv · Bundler · Rails",
    philosophy: "Pin the interpreter with rv, then let Bundler own the gem graph. bin/rails is the only process you start.",
    snippets: [
      {
        filename: "terminal",
        language: "sh",
        code: `# Ruby — rv + Bundler
rv install 3.3.6
rv run ruby -v

bundle add rails redis sidekiq
bundle install

bin/rails server`,
      },
      {
        filename: "Gemfile",
        language: "ruby",
        code: `source "https://rubygems.org"
ruby "3.3.6"

gem "rails", "~> 8.0"
gem "pg"
gem "redis"
gem "sidekiq"
gem "puma"`,
      },
    ],
  },
  fastapi: {
    label: "uv · FastAPI · Uvicorn",
    philosophy: "uv is the lockfile, the venv, and the runner. You never activate anything. uv run is the process.",
    snippets: [
      {
        filename: "terminal",
        language: "sh",
        code: `# Python — uv (Astral)
uv init agent-api
uv add fastapi uvicorn sqlalchemy

uv run uvicorn main:app --reload`,
      },
      {
        filename: "pyproject.toml",
        language: "python",
        code: `[project]
name = "agent-api"
requires-python = ">=3.12"
dependencies = [
  "fastapi",
  "uvicorn",
  "sqlalchemy",
]

# uv.lock is the contract. Do not commit a venv.`,
      },
    ],
  },
};
