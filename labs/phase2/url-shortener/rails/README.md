# Rails implementation checkpoint

This directory now contains the API-only Rails implementation files and a Gemfile for Rails 8.

Install and prepare the app from this directory after generating the standard Rails API skeleton:

```bash
rails new . --api --skip-javascript
bundle install
bin/rails db:prepare
bin/rails test
```

Then implement the shared contract from `../CONTRACT.md`:

- `POST /links` returns `201`;
- invalid URLs return `422`;
- the database unique index owns code uniqueness;
- rescue `ActiveRecord::RecordNotUnique` as `409`;
- analytics belongs in `RecordClick.perform_later`, not the request.

Rails 8 projects should use Active Job with Solid Queue by default. Sidekiq is an alternative adapter, not an assumption of the exercise. The migration, model, controller, job, routes, and request test are included beside this README.
