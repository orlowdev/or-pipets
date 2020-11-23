import test from 'ava'
import { spy } from 'sinon'
import {
	AsyncPipe,
	Pipe,
	extendWith,
	extendWithP,
	tap,
	pipeExtend,
	pipeExtendP,
	pipeTap,
	pipeTapP,
} from '../src'

const fn1 = (x: number) => x + 1
const fn2 = (x: number) => x + 2
const fn3 = (x: number) => x + 3
const efn1 = () => ({ x: 1 })
const efn2 = () => ({ y: 2 })
const efn3 = () => ({ z: 3 })
const afn1 = async (x: number) => x + 1
const afn2 = async (x: number) => x + 2
const afn3 = async (x: number) => x + 3
const aefn1 = async () => ({ x: 1 })
const aefn2 = async () => ({ y: 2 })
const aefn3 = async () => ({ z: 3 })

test('extendWith uses provided function to extend provided object', (t) => {
	const object_ = { x: 1, y: 2 }

	const extend = extendWith(({ x, y }: typeof object_) => ({
		z: x + y,
		y: 5,
	}))

	t.deepEqual(extend(object_), { x: 1, y: 5, z: 3 })
})

test('extendWith does not fail if provided function returns void', (t) => {
	const object_ = { x: 1, y: 2 }
	const extend = extendWith(() => undefined)

	t.deepEqual(extend(object_), object_)
})

test('extendWith does not fail if object is not provided', async (t) => {
	let object_
	const extend = extendWith(() => undefined)

	t.deepEqual(await extend(object_), {})
})

test('extendWithP uses provided function to extend provided object', async (t) => {
	const object_ = { x: 1, y: 2 }

	const extend = extendWithP(({ x, y }: typeof object_) => ({
		z: x + y,
		y: 5,
	}))

	t.deepEqual(await extend(object_), { x: 1, y: 5, z: 3 })
})

test('extendWithP does not fail if provided function returns void', async (t) => {
	const object_ = { x: 1, y: 2 }
	const extend = extendWithP(() => undefined)

	t.deepEqual(await extend(object_), object_)
})

test('extendWithP does not fail if object is not provided', async (t) => {
	let object_
	const extend = extendWithP(() => undefined)

	t.deepEqual(await extend(object_), {})
})

const spyFn = spy()

test('tap calls provided function with provided argument and returns the argument back', (t) => {
	const tapTest = tap(spyFn)
	const result = tapTest(1)
	t.true(spyFn.called)
	t.is(result, 1)
})

test('Pipe associativity (Semigroup)', (t) => {
	t.is(
		Pipe.of(fn1).concat(Pipe.of(fn2)).concat(Pipe.of(fn3)).process(1),
		Pipe.of(fn1)
			.concat(Pipe.of(fn2).concat(Pipe.of(fn3)))
			.process(1),
	)

	t.deepEqual(
		Pipe.of(efn1).concat(Pipe.of(efn2)).concat(Pipe.of(efn3)).process(),
		Pipe.of(efn1)
			.concat(Pipe.of(efn2).concat(Pipe.of(efn3)))
			.process(),
	)
})

test('Pipe left identity (Monoid)', (t) => {
	t.is(Pipe.empty<any>().concat(Pipe.of(fn1)).process(1), Pipe.of(fn1).process(1))
	t.deepEqual(Pipe.empty<any>().concat(Pipe.of(efn1)).process(), Pipe.of(efn1).process())
})

test('Pipe right identity (Monoid)', (t) => {
	t.is(Pipe.of(fn1).concat(Pipe.empty()).process(1), Pipe.of(fn1).process(1))
	t.deepEqual(Pipe.of(efn1).concat(Pipe.empty()).process(), Pipe.of(efn1).process())
})

test('Pipe processes properly with one function', (t) => {
	t.is(Pipe.of(fn1).process(1), 2)
})

test('Pipe processes properly with multiple functions', (t) => {
	t.is(Pipe.from(fn1, fn2).process(3), 6)
})

test('Pipe.pipe extends the middleware chain', (t) => {
	t.is(Pipe.of(fn1).pipe(fn2).process(3), 6)
})

test('Pipe.pipeTap returns the argument instead of the computation result', (t) => {
	t.is(
		Pipe.of(fn1)
			.pipeTap(() => false)
			.process(1),
		2,
	)
})

test('concat merges two Pipes into a single Pipe', (t) => {
	t.is(Pipe.from(fn1).concat(Pipe.from(fn2)).process(3), 6)
	t.deepEqual(Pipe.of(efn1).concat(Pipe.of(efn2)).process(), { y: 2 })
})

test('concat with type transformations preserves the process arg type', (t) => {
	t.true(
		Pipe.of(fn1)
			.concat(Pipe.of((x: number) => x === 2))
			.process(1),
	)

	t.is(Pipe.of(fn1).concat(Pipe.of(String.fromCharCode)).process(34), '#')
})

test('Pipe.pipeExtend extends previous context with its result', (t) => {
	t.deepEqual(Pipe.of(efn1).pipeExtend(efn2).process(), { x: 1, y: 2 })
})

test('Pipe.pipe ends the extension', (t) => {
	t.is(
		Pipe.of(efn1)
			.pipe(({ x }) => x)
			.process(),
		1,
	)
})

test('PipePipe.pipeTap returns the argument instead of the computation result', (t) => {
	t.deepEqual(
		Pipe.of(efn1)
			.pipeTap(() => false)
			.process(),
		{ x: 1 },
	)
})

test('pipeExtend extends previous context with its result', (t) => {
	t.deepEqual(
		Pipe.of(() => ({ x: 1 }))
			.pipeExtend(({ x }) => ({ y: x + 1 }))
			.process(),
		{ x: 1, y: 2 },
	)
})

test('AsyncPipe associativity (Semigroup)', async (t) => {
	t.is(
		await AsyncPipe.of(afn1).concat(AsyncPipe.of(afn2)).concat(AsyncPipe.of(afn3)).processP(1),
		await AsyncPipe.of(afn1)
			.concat(AsyncPipe.of(afn2).concat(AsyncPipe.of(afn3)))
			.processP(1),
	)

	t.deepEqual(
		await AsyncPipe.of(aefn1).concat(AsyncPipe.of(aefn2)).concat(AsyncPipe.of(aefn3)).processP(),
		await AsyncPipe.of(aefn1)
			.concat(AsyncPipe.of(aefn2).concat(AsyncPipe.of(aefn3)))
			.processP(),
	)
})

test('AsyncPipe left identity (Monoid)', async (t) => {
	t.is(
		await AsyncPipe.empty().concat(AsyncPipe.of(afn1)).processP(1),
		await AsyncPipe.of(afn1).processP(1),
	)
	t.deepEqual(
		await AsyncPipe.empty().concat(AsyncPipe.of(aefn1)).processP(),
		await AsyncPipe.of(aefn1).processP(),
	)
})

test('AsyncPipe right identity (Monoid)', async (t) => {
	t.is(
		await AsyncPipe.of(afn1).concat(AsyncPipe.empty()).processP(1),
		await AsyncPipe.of(afn1).processP(1),
	)
	t.deepEqual(
		await AsyncPipe.of(aefn1).concat(AsyncPipe.empty()).processP(),
		await AsyncPipe.of(aefn1).processP(),
	)
})

test('AsyncPipe processes properly with one function', async (t) => {
	t.is(await AsyncPipe.of(afn1).processP(1), 2)
})

test('AsyncPipe processes properly with multiple functions', async (t) => {
	t.is(await AsyncPipe.from(afn1, afn2).processP(3), 6)
})

test('AsyncPipe.pipe extends the middleware chain', async (t) => {
	t.is(await AsyncPipe.of(afn1).pipeP(afn2).processP(3), 6)
})

test('AsyncPipe.pipeTapP returns the argument instead of the computation result', async (t) => {
	t.is(
		await AsyncPipe.of(afn1)
			.pipeTapP(() => false)
			.processP(1),
		2,
	)

	t.deepEqual(
		await AsyncPipe.of(aefn1)
			.pipeTapP(() => false)
			.processP(),
		{ x: 1 },
	)
})

test('concat merges two AsyncPipes into a single AsyncPipe', async (t) => {
	t.is(await AsyncPipe.from(afn1).concat(AsyncPipe.from(afn2)).processP(3), 6)
	t.deepEqual(await AsyncPipe.of(aefn1).concat(AsyncPipe.of(aefn2)).processP(), { y: 2 })
})

test('AsyncPipe concat with type transformations preserves the process arg type', async (t) => {
	t.true(
		await AsyncPipe.of(afn1)
			.concat(AsyncPipe.of((x: number) => x === 2))
			.processP(1),
	)

	t.is(await AsyncPipe.of(afn1).concat(AsyncPipe.of(String.fromCharCode)).processP(34), '#')
})

test('AsyncPipe.pipeExtendP extends previous context with its result', async (t) => {
	t.deepEqual(
		await AsyncPipe.of(aefn1)
			.pipeExtendP(aefn2)
			.pipeTapP(() => null)
			.processP(),
		{
			x: 1,
			y: 2,
		},
	)
})

test('AsyncPipe.pipeP ends the extension', async (t) => {
	t.is(
		await AsyncPipe.of(aefn1)
			.pipeP(({ x }) => x)
			.processP(),
		1,
	)
})

test('AsyncPipe.extendPipeP extends previous context with its result', async (t) => {
	t.deepEqual(
		await AsyncPipe.of(() => ({ x: 1 }))
			.pipeExtendP(({ x }) => ({ y: x + 1 }))
			.processP(),
		{ x: 1, y: 2 },
	)
})

test('asyncPipe.concat(pipe) returns an AsyncPipe', async (t) => {
	t.is(await AsyncPipe.of(afn1).concat(Pipe.of(fn1)).processP(1), 3)
})

test('Helpers -> pipeExtend saves from an issue with a void function going first', (t) => {
	t.deepEqual(pipeExtend(() => undefined).process({ a: 1 }), { a: 1 })
})

test('Helpers -> pipeExtendP saves from an issue with a void function going first', async (t) => {
	t.deepEqual(await pipeExtendP(async () => undefined).processP({ a: 1 }), { a: 1 })
})

test('Helpers -> pipeTap allows starting a pipeline with a tap function', (t) => {
	t.deepEqual(pipeTap(() => undefined).process({ a: 1 }), { a: 1 })
})

test('Helpers -> pipeTapP allows starting a pipeline with a tap function', async (t) => {
	t.deepEqual(await pipeTapP(async () => undefined).processP({ a: 1 }), { a: 1 })
})
