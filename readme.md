# ||l pipets

![pipets logo](./images/logo.jpeg)

![lint](https://github.com/orlovedev/pipets/workflows/lint/badge.svg)
![ava](https://github.com/orlovedev/pipets/workflows/AVA/badge.svg)

[![Maintainability](https://api.codeclimate.com/v1/badges/47fea726a5dfd86413cf/maintainability)](https://codeclimate.com/github/orlovedev/pipets/maintainability)
[![codecov](https://codecov.io/gh/orlovedev/pipets/branch/main/graph/badge.svg)](https://codecov.io/gh/orlovedev/pipets)

[![bundlephobia: minzip](https://img.shields.io/bundlephobia/minzip/pipets)](https://bundlephobia.com/result?p=pipets)

[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![versioning: or-release](https://img.shields.io/badge/versioning-%7C%7Cr-E76D83.svg)](https://github.com/orlovedev/or-release)

Typed pipeable interface for imperative sequences in FP.

This package provides two constructs - `Pipe` and `AsyncPipe`. `AsyncPipe` provides the same methods as `Pipe` but its methods (except for `.concat`) end with **P**, e.g. `.pipeP` instead of `.pipe`. This is done to distinguish in the code when a `Pipe` transforms to an `AsyncPipe`.

- `Pipe.of(func)` and `AsyncPipe.of(asyncFunc)` wrap a function into pipe or async pipe accordingly
- `Pipe.from(...funcs)` and `AsyncPipe.from(...asyncFuncs)` wrap multiple functions
- `Pipe.empty()` and `AsyncPipe.empty()` create empty pipes

- `pipe.pipe(func)` extends the sequence with a function
- `.pipeTap(func)` extends the sequence with a function. The function will be executed but the pipe will ignore its return value and preserve previous context instead
- `.pipeExtend(func)` extends the sequence with a function. The function will be executed and the return value will be merged with the previous context. _Should only be used with objects_
- `a.concat(b)` creates a new pipe that contains sequences of both pipes. If either `a` or `b` is an `AsyncPipe`, an `AsyncPipe` is returned, no matter what another pipe was.

## Installation

```sh
yarn add pipets
```

or

```sh
npm i -S pipets
```

## Examples

### Bored

Suggests you ideas in case you get bored.

```typescript
import { EventEmitter } from 'events'
// You also need node-fetch for this to work
import fetch, { Response } from 'node-fetch'
import { AsyncPipe } from 'pipets'

const emitter = new EventEmitter()

const getJson = async (response: Response) => response.json()

const boredPipe = AsyncPipe.of(() => 'https://www.boredapi.com/api/activity')
	.pipeTapP(() => console.log('Searching for activities... 🤔'))
	.pipeP(fetch)
	.pipeP(getJson)
	.pipeP((json: { activity: string }) => json.activity)
	.pipeTapP(() => console.log('Found one 🎉'))
	.pipeP((activity) => `  💡 ${activity}`)
	.pipeP(console.log)

emitter.on('bored', boredPipe.processP)

setTimeout(() => emitter.emit('bored'), 300)
```

### Add 10

Adds 10 to the number you provide as a CLI argument.

```typescript
import { Pipe } from 'pipets'

// Start with removing the first two strings in the argv
Pipe.of((argv: string[]) => argv.slice(2))
	// .pipeTap executes provided function but the return value is
	// ignored - the argument is passed to the next function instead
	// Log the context to console
	.pipeTap((x) => console.log('>>>', x))
	// Get the first item in the array and parse a number, 0 if NaN
	.pipe(([numberString]) => Number.parseInt(numberString, 10) || 0)
	// Log the context to console
	.pipeTap((x) => console.log('>>>', x))
	// Add 10
	.pipe((number) => number + 10)
	// Log the result to console
	.pipe((result) => console.log(`🧮 ${result}`))
	// Pass argv to the context of the Pipe
	.process(process.argv)
```

### Welcome to localhost

Welcomes you to localhost:3000.

```typescript
import * as express from 'express'
import { Pipe } from 'pipets'

const app = express()

interface ICtx {
	request: express.Request
	response: express.Response
}

// Here we start with Pipe.empty() because our first function returns
// void. If we pass it to Pipe.of, it will pass nothing to the first
// pipeExtend and the code will fail. This is because pipeExtend
// manages saving previous context, not the Pipe itself.
const getSlashPipeline = Pipe.empty<ICtx>()
	.pipeExtend(({ response }) => response.setHeader('X-Powered-By', 'Express with Pipe'))
	// Puts the value of the Host header to the context
	.pipeExtend(({ request }) => ({ host: request.header('host') ?? '🤔' }))
	// Creates the response string with the host
	.pipeExtend(({ host }) => ({ responseBody: `Welcome to ${host}!` }))
	// Wraps the response string into h1
	.pipeExtend(({ responseBody }) => ({ responseBody: `<h1>${responseBody}</h1>` }))
	// Sends the response
	.pipe(({ response, responseBody }) => response.send(responseBody))

app.get('/', (request, response) => getSlashPipeline.process({ request, response }))

app.listen(3000, () => {
	console.log(`Example app listening on port 3000`)
})
```
