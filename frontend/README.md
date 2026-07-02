# Sveltekit tailwind boilerplate

We use this Sveltekit and tailwind boilerplate throughout the whole course.

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

Start the frontend and backend together:

```bash
npm run dev:all
```

Stop both from another terminal:

```bash
npm run dev:all:stop
```

You can also press `Ctrl+C` in the terminal running `npm run dev:all` to stop both.

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
>
