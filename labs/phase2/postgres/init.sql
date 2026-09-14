-- Keep the framework implementations isolated while they share one Postgres server.
-- Each service owns its schema and migrations, so FastAPI bootstrap cannot collide
-- with Rails migrations.
CREATE DATABASE fastapi_lab;
CREATE DATABASE rails_lab;
