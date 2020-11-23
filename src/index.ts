const _fs = Symbol('functions')
const _async = Symbol('async')

export type UnaryFunction<TArg, TReturn = TArg> = (x: TArg) => TReturn

export type UnPromise<T> = T extends Promise<infer U> ? U : T

//---------------------------------------------------------------------

export const extendWith = <TArg extends Record<string, any>, TResult = TArg>(
	f: UnaryFunction<TArg, TResult>,
) => (object: TArg = {} as TArg): TArg & TResult => ({
	...object,
	...f(object),
})

export const extendWithP = <TArg, TResult = TArg>(
	f: UnaryFunction<UnPromise<TArg> extends Record<string, any> ? UnPromise<TArg> : never, TResult>,
) => async (
	object: UnPromise<TArg> = {} as UnPromise<TArg>,
): Promise<UnPromise<TArg> & TResult> => ({
	...((await object) as any),
	...(await f(object as any)),
})

export const tap = <TArg>(f: UnaryFunction<TArg, any>) => (x: TArg): TArg => {
	f(x)

	return x
}

//---------------------------------------------------------------------

export interface IPipeStatic {
	from: <TContext, TProcess>(...functions: Array<UnaryFunction<any>>) => IPipe<TContext, TProcess>
	of: <TProcess, TContext = TProcess>(
		f: UnaryFunction<TProcess, TContext>,
	) => IPipe<TContext extends void ? TProcess : TContext, TProcess>
	empty: <TContext, TProcess = TContext>() => IPipe<TContext, TProcess>
}

export interface IPipe<TContext, TProcess = TContext> {
	[_async]: false
	[_fs]: Array<UnaryFunction<any>>
	pipe: <TNewContext>(f: UnaryFunction<TContext, TNewContext>) => IPipe<TNewContext, TProcess>
	pipeTap: (f: UnaryFunction<TContext, any>) => IPipe<TContext, TProcess>
	pipeExtend: <TNewContext>(
		f: UnaryFunction<TContext, TNewContext | void>,
	) => IPipe<TContext extends TNewContext ? TContext : TContext & TNewContext, TProcess>
	concat: <TOtherContext>(other: IPipe<TOtherContext, TContext>) => IPipe<TOtherContext, TProcess>
	process: (initialContext?: TProcess) => TContext
}

export const Pipe: IPipeStatic = {
	from: (...functions) => pipe(functions),
	of: (f) => Pipe.from(f),
	empty: () => Pipe.from(),
}

export const pipe = <TContext, TProcess = TContext>(
	fs: Array<UnaryFunction<any>>,
): IPipe<TContext, TProcess> => ({
	[_fs]: fs,
	[_async]: false,
	pipe: (f) => Pipe.from(...fs, f),
	pipeTap: (f) => Pipe.from(...fs, tap(f)),
	pipeExtend: (f) => Pipe.from(...fs, extendWith(f)),
	concat: (other) => Pipe.from(...fs.concat(other[_fs])) as any,
	process: (initialContext) =>
		(fs.reduce((result, f) => f(result), initialContext) as unknown) as TContext,
})

//---------------------------------------------------------------------

export interface IAsyncPipeStatic {
	from: <TContext, TProcess>(
		...functions: Array<UnaryFunction<any>>
	) => IAsyncPipe<TContext, TProcess>
	of: <TContext, TProcess = TContext>(
		f: UnaryFunction<UnPromise<TProcess>, TContext>,
	) => IAsyncPipe<TContext, TProcess>
	empty: <TContext, TProcess = TContext>() => IAsyncPipe<TContext, TProcess>
}

export interface IAsyncPipe<TContext, TProcess = TContext> {
	[_fs]: Array<UnaryFunction<any>>
	[_async]: true
	pipeP: <TNewContext>(
		f: UnaryFunction<UnPromise<TContext>, TNewContext>,
	) => IAsyncPipe<TNewContext, TProcess>
	pipeTapP: (f: UnaryFunction<UnPromise<TContext>, any>) => IAsyncPipe<TContext, TProcess>
	pipeExtendP: <TNewContext>(
		f: UnaryFunction<
			UnPromise<TContext> extends Record<string, any> ? UnPromise<TContext> : never,
			TNewContext | void
		>,
	) => IAsyncPipe<TContext extends TNewContext ? TContext : TContext & TNewContext, TProcess>
	concat: <TOtherContext>(
		other: IPipe<TOtherContext, any> | IAsyncPipe<TOtherContext, any>,
	) => IAsyncPipe<TOtherContext, TProcess>
	processP: (initialContext?: TProcess) => Promise<TContext>
}

export const AsyncPipe: IAsyncPipeStatic = {
	from: (...functions) => asyncPipe(functions),
	of: (f) => AsyncPipe.from(f),
	empty: () => AsyncPipe.from(),
}

export const asyncPipe = <TContext, TProcess = TContext>(
	fs: Array<UnaryFunction<any>>,
): IAsyncPipe<TContext, TProcess> => ({
	[_fs]: fs,
	[_async]: true,
	pipeP: (f) => AsyncPipe.from(...fs, f),
	pipeTapP: (f) => AsyncPipe.from(...fs, tap(f)),
	pipeExtendP: (f) => AsyncPipe.from(...fs, extendWithP(f)),
	concat: (other) => AsyncPipe.from(...fs.concat(other[_fs])),
	processP: async (initialContext) => {
		let result: any = initialContext

		for (const f of fs) {
			result = await f(result)
		}

		return result as TContext
	},
})

export const pipeExtend = <TContext, TResult, TFunction extends UnaryFunction<TContext, TResult>>(
	f: TFunction,
) => Pipe.empty<TContext, TResult>().pipeExtend(f)

export const pipeExtendP = <
	TContext,
	TResult,
	TFunction extends UnaryFunction<
		UnPromise<TContext> extends Record<string, any> ? UnPromise<TContext> : never,
		TResult
	>
>(
	f: TFunction,
) => AsyncPipe.empty<TContext, TResult>().pipeExtendP(f)

export const pipeTap = <TContext, TFunction extends UnaryFunction<TContext, any>>(f: TFunction) =>
	Pipe.empty<TContext>().pipeTap(f)

export const pipeTapP = <TContext, TFunction extends UnaryFunction<UnPromise<TContext>, any>>(
	f: TFunction,
) => AsyncPipe.empty<TContext>().pipeTapP(f)

export const pipeP = asyncPipe
