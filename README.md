# `hackend`

work-in-progress generic backend + frontend components with multiplayer support for editors like Blot and Sprig

## Development

```shell
yarn
yarn --silent generate_jwk >> .env
yarn start
```

You'll also want to configure your `.env` file with
- `SENDGRID_API_KEY`
- `PORT`
- `DB_PATH` (a file path to store a sqlite database at)
- `PROJECT_NAME` (name of the project this hackend instance is being used for, to put in email templates)

## Features for further investigation

- We might want to have some garbage collection (automatically getting rid of history) since automerge stores full history of documents. Their documentation says this actually isn't a problem/isn't very inefficient, but this seems odd to me and it might be worth looking more into/doing some tests. 