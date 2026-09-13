# Rails implementation checkpoint

Create an API-only Rails app in this directory with:

```bash
rails new . --api --skip-javascript
bin/rails generate model Link code:string url:string
bin/rails generate job RecordClick
```

Then implement the shared contract from `../CONTRACT.md`:

- `POST /links` returns `201`;
- invalid URLs return `422`;
- the database unique index owns code uniqueness;
- rescue `ActiveRecord::RecordNotUnique` as `409`;
- analytics belongs in `RecordClick.perform_later`, not the request.

Rails 8 projects should use Active Job with Solid Queue by default. Sidekiq is an alternative adapter, not an assumption of the exercise.
