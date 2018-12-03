import {createSelectorCreator, defaultMemoize} from 'reselect';
import createCachedSelector from '../src/index';

function testSelector() {
  type State = {foo: string};

  const selector = createCachedSelector(
    (state: State) => state.foo,
    foo => foo
  )((state: State) => state.foo);

  const result: string = selector({foo: 'bar'});
  // typings:expect-error
  const num: number = selector({foo: 'bar'});

  const matchingSelectors = selector.getMatchingSelector({foo: 'bar'});
  const resultFunc: (foo: string) => string = matchingSelectors.resultFunc;

  // typings:expect-error
  selector.getMatchingSelector('foo');

  selector.removeMatchingSelector({foo: 'bar'});
  // typings:expect-error
  selector.removeMatchingSelector('foo');

  selector.clearCache();

  selector.cache;

  // typings:expect-error
  selector({foo: 'bar'}, {prop: 'value'});

  // typings:expect-error
  createCachedSelector(
    (state: {foo: string}) => state.foo,
    (state: {bar: number}) => state.bar,
    (foo, bar) => 1
  )((state: State) => state.foo);
}

function testGenericRestParams() {
  type State = {foo: string};

  function compute(...args: any[]) {
    return true;
  }

  const selectArgument1 = <T>(arg1: T): T => arg1;
  const selectArgument2 = <T>(arg1: any, arg2: T): T => arg2;
  const selectArgument3 = <T>(arg1: any, arg2: any, arg3: T): T => arg3;
  const selectArgument4 = <T>(arg1: any, arg2: any, arg3: any, arg4: T): T =>
    arg4;

  {
    // old school selector with maximum typing
    const selector = createCachedSelector(
      (state: State, arg1: string, arg2: number, arg3: boolean) => arg1,
      (state: State, arg1: string, arg2: number, arg3: boolean) => arg2,
      (state: State, arg1: string, arg2: number, arg3: boolean) => arg3,
      (arg1, arg2, arg3) => compute(arg1, arg2, arg3)
    )((state: State) => state.foo);
    selector({foo: 'bar'}, 'foo', 1, false);
  }

  {
    // old school selector with omitting unneeded arguments
    const selector = createCachedSelector(
      (state: State, arg1: string) => arg1,
      (state: State, arg1: string, arg2: number) => arg2,
      (state: State, arg1: string, arg2: number, arg3: boolean) => arg3,
      (arg1, arg2, arg3) => compute(arg1, arg2, arg3)
    )((state: State) => state.foo);
    selector({foo: 'bar'}, 'foo', 1, false);
  }

  {
    // using select arguments
    const selector = createCachedSelector(
      selectArgument2,
      selectArgument3,
      selectArgument4,
      (arg1: string, arg2: number, arg3: boolean) => compute(arg1, arg2, arg3)
    )(selectArgument2);
    selector({foo: 'bar'}, 'foo', 1, false);
  }

  {
    // using select arguments with explicit selector signature
    const selector: (
      state: State,
      userId: string,
      age: number,
      isAdmin: boolean
    ) => boolean = createCachedSelector(
      selectArgument2,
      selectArgument3,
      selectArgument4,
      (arg2: string, arg3: number, arg4: boolean) => compute(arg2, arg3, arg4)
    )(selectArgument2);
    selector({foo: 'bar'}, 'foo', 1, false);
  }

  {
    // checking that explicit/implicit typings don't contradict
    const selector = createCachedSelector<
      State,
      [string, number, boolean],
      string,
      number,
      boolean,
      boolean
    >(
      (state: State, arg1: string, arg2: number, arg3: boolean) => arg1,
      (state: State, arg1: string, arg2: number, arg3: boolean) => arg2,
      (state: State, arg1: string, arg2: number, arg3: boolean) => arg3,
      (arg1, arg2, arg3) => compute(arg1, arg2, arg3)
    )((state: State) => state.foo);
    selector({foo: 'bar'}, 'foo', 1, false);
  }

  {
    // optimal typing for complex cases - all in one place
    const selector = createCachedSelector<
      State,
      [string, number, boolean],
      string,
      number,
      boolean,
      boolean
    >(
      (state, arg1, arg2, arg3) => arg1,
      (state, arg1, arg2, arg3) => arg2,
      (state, arg1, arg2, arg3) => arg3,
      (arg1, arg2, arg3) => compute(arg1, arg2, arg3)
    )(state => state.foo);
    selector({foo: 'bar'}, 'foo', 1, false);
  }

  {
    // optimal typing for complex cases - omit unnecessary arguments
    const selector = createCachedSelector<
      State,
      [string, number, boolean],
      string,
      number,
      boolean,
      boolean
    >(
      (state, arg1) => arg1,
      (state, arg1, arg2) => arg2,
      (state, arg1, arg2, arg3) => arg3,
      (arg1, arg2, arg3) => compute(arg1, arg2, arg3)
    )(state => state.foo);
    selector({foo: 'bar'}, 'foo', 1, false);
  }
}

function testNestedSelector() {
  type State = {foo: string; bar: number; baz: boolean};

  const selector = createCachedSelector(
    createCachedSelector(
      (state: State) => state.foo,
      (state: State) => state.bar,
      (foo, bar) => ({foo, bar})
    )((state: State) => state.foo),
    (state: State) => state.baz,
    ({foo, bar}, baz) => {
      const foo1: string = foo;
      // typings:expect-error
      const foo2: number = foo;

      const bar1: number = bar;
      // typings:expect-error
      const bar2: string = bar;

      const baz1: boolean = baz;
      // typings:expect-error
      const baz2: string = baz;
    }
  )((state: State) => state.bar);
}

function testInvalidTypeInCombinator() {
  type State = {foo: string; bar: number; baz: boolean};

  // typings:expect-error
  createCachedSelector((state: State) => state.foo, (foo: number) => foo)(
    (state: State) => foo
  );

  // typings:expect-error
  createCachedSelector(
    (state: State) => state.foo,
    state => state.bar,
    state => state.baz,
    (foo: string, bar: number, baz: boolean, fizz: string) => {}
  )((state: State) => foo);
}

function testParametricSelector() {
  type State = {foo: string};
  type Props = {bar: number};

  const selector = createCachedSelector(
    (state: State) => state.foo,
    (state: never, props: Props) => props.bar,
    (foo, bar) => ({foo, bar})
  )((state: never, props: Props) => props.bar);

  const result = selector({foo: 'fizz'}, {bar: 42});
  const foo: string = result.foo;
  const bar: number = result.bar;

  // typings:expect-error
  selector({foo: 'fizz'});
  // typings:expect-error
  selector({foo: 'fizz'}, {bar: 'baz'});

  const matchingSelectors = selector.getMatchingSelector(
    {foo: 'fizz'},
    {bar: 42}
  );
  const resultFunc: (foo: string, bar: number) => object =
    matchingSelectors.resultFunc;

  // typings:expect-error
  selector.getMatchingSelector({foo: 'fizz'}, {bar: 'fuzz'});

  selector.removeMatchingSelector({foo: 'fizz'}, {bar: 42});
  // typings:expect-error
  selector.removeMatchingSelector({foo: 'fizz'});

  selector.clearCache();

  selector.cache;

  const selector2 = createCachedSelector(
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    state => state.foo,
    (state: State, props: Props) => props.bar,
    (foo1, foo2, foo3, foo4, foo5, bar) => ({
      foo1,
      foo2,
      foo3,
      foo4,
      foo5,
      bar,
    })
  )((state: never, props: Props) => props.bar);

  selector2({foo: 'fizz'}, {bar: 42});
}

function testArrayArgument() {
  const selector = createCachedSelector(
    [
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: never, props: {bar: number}) => props.bar,
    ],
    (foo1, foo2, bar) => ({foo1, foo2, bar})
  )((state: never, props: {bar: number}) => props.bar);

  const ret = selector({foo: 'fizz'}, {bar: 42});
  const foo1: string = ret.foo1;
  const foo2: string = ret.foo2;
  const bar: number = ret.bar;

  // typings:expect-error
  createCachedSelector([(state: {foo: string}) => state.foo])(
    (state: {foo: string}) => state.foo
  );

  // typings:expect-error
  createCachedSelector(
    [(state: {foo: string}) => state.foo, (state: {bar: number}) => state.bar],
    (foo, bar) => {}
  )((state: {foo: string}) => state.foo);

  // typings:expect-error
  createCachedSelector(
    [(state: {foo: string}) => state.foo, (state: {foo: string}) => state.foo],
    (foo: string, bar: number) => {}
  )((state: {foo: string}) => state.foo);

  createCachedSelector(
    [
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
    ],
    (
      foo1: string,
      foo2: string,
      foo3: string,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: string,
      foo9: string,
      foo10: string
    ) => {}
  )((state: {foo: string}) => state.foo);

  // typings:expect-error
  createCachedSelector(
    [
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
    ],
    (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8: number, foo9, foo10) => {}
  )((state: {foo: string}) => state.foo);

  // typings:expect-error
  createCachedSelector(
    [
      (state: {foo: string}) => state.foo,
      state => state.foo,
      state => state.foo,
      state => state.foo,
      state => state.foo,
      state => state.foo,
      state => state.foo,
      state => state.foo,
      1,
    ],
    (foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9) => {}
  )(state => state.foo);

  const selector2 = createCachedSelector(
    [
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
    ],
    (
      foo1: string,
      foo2: string,
      foo3: string,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: string,
      foo9: string
    ) => {
      return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, foo9};
    }
  )((state: {foo: string}) => state.foo);

  {
    const ret = selector2({foo: 'fizz'});
    const foo1: string = ret.foo1;
    const foo2: string = ret.foo2;
    const foo3: string = ret.foo3;
    const foo4: string = ret.foo4;
    const foo5: string = ret.foo5;
    const foo6: string = ret.foo6;
    const foo7: string = ret.foo7;
    const foo8: string = ret.foo8;
    const foo9: string = ret.foo9;
    // typings:expect-error
    ret.foo10;
  }

  // typings:expect-error
  selector2({foo: 'fizz'}, {bar: 42});

  const parametric = createCachedSelector(
    [
      (state: never, props: {bar: number}) => props.bar,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
      (state: {foo: string}) => state.foo,
    ],
    (
      bar: number,
      foo1: string,
      foo2: string,
      foo3: string,
      foo4: string,
      foo5: string,
      foo6: string,
      foo7: string,
      foo8: string
    ) => {
      return {foo1, foo2, foo3, foo4, foo5, foo6, foo7, foo8, bar};
    }
  )((state: never, props: {bar: number}) => props.bar);

  // typings:expect-error
  parametric({foo: 'fizz'});

  {
    const ret = parametric({foo: 'fizz'}, {bar: 42});
    const foo1: string = ret.foo1;
    const foo2: string = ret.foo2;
    const foo3: string = ret.foo3;
    const foo4: string = ret.foo4;
    const foo5: string = ret.foo5;
    const foo6: string = ret.foo6;
    const foo7: string = ret.foo7;
    const foo8: string = ret.foo8;
    const bar: number = ret.bar;
    // typings:expect-error
    ret.foo9;
  }
}

function testResolver() {
  type State = {foo: string; obj: {bar: string}};

  const selector = createCachedSelector(
    (state: State) => state.foo,
    (state: never, arg1: number) => arg1,
    (state: never, arg1: number, arg2: number) => arg1 + arg2,
    (foo, arg1, sum) => ({foo, arg1, sum})
  )((state: never, arg1: number, arg2: number) => arg1 + arg2);

  selector({foo: 'fizz', obj: {bar: 'bar'}}, 1, 2);

  const selector2 = createCachedSelector(
    (state: State) => state.obj,
    obj => obj
  )((state: never, obj) => obj);
}

function testCustomSelectorCreator() {
  type State = {foo: string};

  const selector1 = createCachedSelector(
    (state: State) => state.foo,
    foo => foo
  )((state: State) => state.foo, createSelectorCreator(defaultMemoize));

  const selector2 = createCachedSelector(
    (state: State) => state.foo,
    foo => foo
  )((state: State) => state.foo, {
    selectorCreator: createSelectorCreator(defaultMemoize),
  });

  // typings:expect-error
  const selectorFailing = createCachedSelector(
    (state: State) => state.foo,
    foo => foo
  )((state: State) => state.foo, (): void => {});
}
