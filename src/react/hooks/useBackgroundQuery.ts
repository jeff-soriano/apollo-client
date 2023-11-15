import * as React from "rehackt";
import type {
  DocumentNode,
  FetchMoreQueryOptions,
  OperationVariables,
  TypedDocumentNode,
  WatchQueryOptions,
} from "../../core/index.js";
import { useApolloClient } from "./useApolloClient.js";
import {
  unwrapQueryRef,
  updateWrappedQueryRef,
  wrapQueryRef,
} from "../cache/QueryReference.js";
import type { QueryReference } from "../cache/QueryReference.js";
import type { BackgroundQueryHookOptions, NoInfer } from "../types/types.js";
import { __use } from "./internal/index.js";
import { getSuspenseCache } from "../cache/index.js";
import { useWatchQueryOptions } from "./useSuspenseQuery.js";
import type { FetchMoreFunction, RefetchFunction } from "./useSuspenseQuery.js";
import { canonicalStringify } from "../../cache/index.js";
import type { DeepPartial } from "../../utilities/index.js";
import type { CacheKey } from "../cache/types.js";
import type { SkipToken } from "./constants.js";

export type UseBackgroundQueryResult<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
> = {
  fetchMore: FetchMoreFunction<TData, TVariables>;
  refetch: RefetchFunction<TData, TVariables>;
};

type BackgroundQueryHookOptionsNoInfer<
  TData,
  TVariables extends OperationVariables,
> = BackgroundQueryHookOptions<NoInfer<TData>, NoInfer<TVariables>>;

export function useBackgroundQuery<
  TData,
  TVariables extends OperationVariables,
  TOptions extends Omit<BackgroundQueryHookOptions<TData>, "variables">,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: BackgroundQueryHookOptionsNoInfer<TData, TVariables> & TOptions
): [
  (
    | QueryReference<
        TOptions["errorPolicy"] extends "ignore" | "all"
          ? TOptions["returnPartialData"] extends true
            ? DeepPartial<TData> | undefined
            : TData | undefined
          : TOptions["returnPartialData"] extends true
          ? DeepPartial<TData>
          : TData
      >
    | (TOptions["skip"] extends boolean ? undefined : never)
  ),
  UseBackgroundQueryResult<TData, TVariables>,
];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options: BackgroundQueryHookOptionsNoInfer<TData, TVariables> & {
    returnPartialData: true;
    errorPolicy: "ignore" | "all";
  }
): [
  QueryReference<DeepPartial<TData> | undefined>,
  UseBackgroundQueryResult<TData, TVariables>,
];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options: BackgroundQueryHookOptionsNoInfer<TData, TVariables> & {
    errorPolicy: "ignore" | "all";
  }
): [
  QueryReference<TData | undefined>,
  UseBackgroundQueryResult<TData, TVariables>,
];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options: BackgroundQueryHookOptionsNoInfer<TData, TVariables> & {
    skip: boolean;
    returnPartialData: true;
  }
): [
  QueryReference<DeepPartial<TData>> | undefined,
  UseBackgroundQueryResult<TData, TVariables>,
];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options: BackgroundQueryHookOptionsNoInfer<TData, TVariables> & {
    returnPartialData: true;
  }
): [
  QueryReference<DeepPartial<TData>>,
  UseBackgroundQueryResult<TData, TVariables>,
];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options: BackgroundQueryHookOptionsNoInfer<TData, TVariables> & {
    skip: boolean;
  }
): [
  QueryReference<TData> | undefined,
  UseBackgroundQueryResult<TData, TVariables>,
];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: BackgroundQueryHookOptionsNoInfer<TData, TVariables>
): [QueryReference<TData>, UseBackgroundQueryResult<TData, TVariables>];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options: SkipToken
): [undefined, UseBackgroundQueryResult<TData, TVariables>];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options:
    | SkipToken
    | (BackgroundQueryHookOptionsNoInfer<TData, TVariables> & {
        returnPartialData: true;
      })
): [
  QueryReference<DeepPartial<TData>> | undefined,
  UseBackgroundQueryResult<TData, TVariables>,
];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options?: SkipToken | BackgroundQueryHookOptionsNoInfer<TData, TVariables>
): [
  QueryReference<TData> | undefined,
  UseBackgroundQueryResult<TData, TVariables>,
];

export function useBackgroundQuery<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
>(
  query: DocumentNode | TypedDocumentNode<TData, TVariables>,
  options:
    | (SkipToken &
        Partial<BackgroundQueryHookOptionsNoInfer<TData, TVariables>>)
    | BackgroundQueryHookOptionsNoInfer<TData, TVariables> = Object.create(null)
): [
  QueryReference<TData> | undefined,
  UseBackgroundQueryResult<TData, TVariables>,
] {
  const client = useApolloClient(options.client);
  const suspenseCache = getSuspenseCache(client);
  const watchQueryOptions = useWatchQueryOptions({ client, query, options });
  const { fetchPolicy, variables } = watchQueryOptions;
  const { queryKey = [] } = options;

  // This ref tracks the first time query execution is enabled to determine
  // whether to return a query ref or `undefined`. When initialized
  // in a skipped state (either via `skip: true` or `skipToken`) we return
  // `undefined` for the `queryRef` until the query has been enabled. Once
  // enabled, a query ref is always returned regardless of whether the query is
  // skipped again later.
  const didFetchResult = React.useRef(fetchPolicy !== "standby");
  didFetchResult.current ||= fetchPolicy !== "standby";

  const cacheKey: CacheKey = [
    query,
    canonicalStringify(variables),
    ...([] as any[]).concat(queryKey),
  ];

  const queryRef = suspenseCache.getQueryRef(cacheKey, () =>
    client.watchQuery(watchQueryOptions as WatchQueryOptions<any, any>)
  );

  const [wrapped, setWrappedQueryRef] = React.useState({
    current: wrapQueryRef(queryRef, queryRef.promise),
  });
  if (unwrapQueryRef(wrapped.current)[0] !== queryRef) {
    wrapped.current = wrapQueryRef(queryRef, queryRef.promise);
  }
  let wrappedQueryRef = wrapped.current;
  if (queryRef.didChangeOptions(watchQueryOptions)) {
    const promise = queryRef.applyOptions(watchQueryOptions);
    updateWrappedQueryRef(wrappedQueryRef, promise);
  }

  React.useEffect(() => queryRef.retain(), [queryRef]);

  const fetchMore: FetchMoreFunction<TData, TVariables> = React.useCallback(
    (options) => {
      const promise = queryRef.fetchMore(options as FetchMoreQueryOptions<any>);

      setWrappedQueryRef({ current: wrapQueryRef(queryRef, queryRef.promise) });

      return promise;
    },
    [queryRef]
  );

  const refetch: RefetchFunction<TData, TVariables> = React.useCallback(
    (variables) => {
      const promise = queryRef.refetch(variables);

      setWrappedQueryRef({ current: wrapQueryRef(queryRef, queryRef.promise) });

      return promise;
    },
    [queryRef]
  );

  return [
    didFetchResult.current ? wrappedQueryRef : void 0,
    { fetchMore, refetch },
  ];
}
