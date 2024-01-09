# `hackend-frontend`

this somewhat contradictorily-named package provides client code to interact with hackend from a React app.

## Integration guide

There's [an example](./example) you can reference, but here's the steps summarized

### `init`
Call `init` with your API's URL somewhere early on in the code to initialize the client.

### Auth

Most likely, you'll want to use the hooks this package provides (based on TanStack Query) but there are also fetch functions you can directly use (see [here](./src/auth.ts)). This also applies for project queries/mutations.

- `useUser()`: return an object with user data (most importantly, their `uid` and `email`), or undefined if not signed in
- `useSendLoginCode()`: this is one of many TanStack Query hooks, I highly recommend reading [that documentation](https://tanstack.com/query/latest/docs/react/guides/mutations) to understand what these return. The most important properties are `{loading, error, mutate}`, where mutate is a function that accepts an `email` string.
- `useLogin()`: also a TanStack hook, the `mutate` property of the returned object is a function that takes a string of the code the user gets from their email and inputs. This will log the user in and set up the session stuff on the frontend.
- There are other auth functions implemented on the server for changing a user's email - right now, there aren't hooks provided for that (`TODO`!)

### CodeMirror setup
- Add the `amExtension` to your extensions array
- Add the hook that allows the extension to work, `useAMExtension` - you probably want to put this in the same component you're rendering CodeMirror in. `useAMExtension` takes three parameters:
  - `view`: your CM `EditorView` instance
  - `handle`: an Automerge `DocHandle` (or `undefined`, if you don't want to initialize the extension yet). You can get this by calling `repo.find(id)`, we'll go over that later.
  - `fieldPath`: this is the path to the property in your project object that has the string with the code editor contents. For example, if your project data stores the code at `project.source`, then you'd want to pass `["source"]`. If for some reason it's nested deeper in your object, just add each property access as another key in the array, like `project.thing.source` -> `["thing", "source"]`.
- Add the `dispatchTransactions` handler to your `EditorView` when setting it up. This looks something like
```ts
const view: EditorView = new EditorView({
    /* other stuff */
    dispatchTransactions: makeDispatchTransactions(() => view)
});
```
(the closure wrapping view is just to pass a self-reference without declaring the variable separately as `let` then assigning to it)

### Project stuff

There are a bunch of project hooks you can call. They tend to be pretty self-explanatory, but some key points:
- Aliases are share links. They allow anyone with the alias to connect to edit the automerge document. 
- Once you have a project ID, you can get an automerge `DocHandle` with `repo.find(id)` (`repo` is an export from this package). 