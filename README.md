MinKAS
======

A minimal KAS implementation for debugging applications using KAS, locally.

## Usage

1. Install [Node](https://nodejs.org/)
2. `npx @keeer/minkas`

## Configuration

Configure minKAS with environment variables. All options:

```shell
MINKAS_PORT=8081 \ # port to listen on
MINKAS_HOSTNAME=localhost \ # default hostname of MinKAS; used to open controls
SILENT=1 \ # do not open controls
MINKAS_COOKIE_DOMAIN=.keeer.net \ # specify which domain to set cookie on
npx @keeer/minkas
```

You can set them in your shell profile to avoid having to set them each time.
