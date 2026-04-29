---
title: Adapter
---

# Adapter

An `adapter` is the I/O boundary of the system. It is the only construct permitted to communicate with the outside world — HTTP APIs, databases, local storage, hardware, or operating system services. Every external call in a WORDS specification is traceable to an adapter.

## Purpose

An adapter's role is to bridge the system to external services and resources. Where a provider works with data already inside the system, an adapter reaches outside it. It is the only construct in the language permitted to perform I/O, and the only one permitted to be async.

This constraint is deliberate. By concentrating all external communication in adapters, a WORDS specification makes the system boundary explicit. Every point at which the system touches the outside world is named, typed, and visible in the specification. Nothing is hidden inside a state, a provider, or a view.

## Syntax

The `adapter` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body declares `props`, `state`, and `interface`:

```wds title="AuthModule/adapters/AuthAdapter.wds"
module AuthModule
adapter AuthAdapter "Connects to the authentication service" (
    props (
        baseUrl(string),
        timeoutMs(integer) is 5000
    )
    interface (
        login credentials(AccountCredentials) returns(SystemUser)
            "Authenticates the user against the backend"
        logout session(SessionToken)
            "Invalidates the current session"
        refreshToken token(SessionToken) returns(SessionToken)
            "Exchanges an expiring token for a new one"
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this adapter to its module.

## `props`

`props` declares the environment-level configuration the adapter receives at initialisation. These are stable values that do not change at runtime — base URLs, timeouts, API keys, and similar settings:

```wds title="SessionModule/adapters/SessionAdapter.wds"
module SessionModule
adapter SessionAdapter "Connects to external systems for synchronising the session" (
    props (
        baseUrl(string),
        timeoutMs(integer) is 5000,
        retryAttempts(integer) is 3
    )
    interface (
        checkSession returns(?StoredSession)
            "Checks for any previous sessions"
        validateSession existing(StoredSession) returns(SessionToken)
            "Validates the stored session against the backend"
        refreshSession expiring(SessionToken) returns(SessionToken)
            "Exchanges the refresh token for a new access token"
    )
)
```

Props on an adapter are configuration, not runtime data. They are set once when the adapter is initialised and do not change during the lifetime of the session.

## `state`

`state` declares instance-level data the adapter owns and manages internally — connection state, cached tokens, retry counters, or any other runtime value the adapter needs to track between calls:

```wds title="CatalogueModule/adapters/CatalogueAdapter.wds"
module CatalogueModule
adapter CatalogueAdapter "Connects to the product catalogue service" (
    props (
        baseUrl(string),
        apiKey(string)
    )
    state (
        lastFetchedAt(?integer),
        cachedEtag(?string)
    )
    interface (
        fetchCatalogue returns(list(CatalogueItem))
            "Fetches the full product catalogue"
        fetchItem id(string) returns(?CatalogueItem)
            "Fetches a single catalogue item by id"
    )
)
```

## `interface`

`interface` declares the methods the adapter exposes to other components. Each method is named, lists its parameters if any, and declares its return type if it produces one. Return types can be primitives, interface components, lists, maps, optional values, or other declared types:

```wds title="OrdersModule/adapters/OrdersAdapter.wds"
module OrdersModule
adapter OrdersAdapter "Connects to the orders service" (
    props (
        baseUrl(string),
        timeoutMs(integer) is 8000
    )
    interface (
        fetchOrders returns(list(OrderSummary))
            "Fetches the full order history for the current user"
        fetchOrder id(string) returns(OrderDetail)
            "Fetches a single order in full detail"
        placeOrder cart(CartSummary) returns(OrderReceipt)
            "Submits a new order"
        cancelOrder id(string) returns(OrderCancelled)
            "Cancels an existing order by id"
    )
)
```

A method that produces no output omits the `returns` clause. A method that takes no parameters lists only its name and description. All methods on an adapter are implicitly async — they reach outside the system and may not resolve immediately.

## The Async Rule

An adapter is the only construct in WORDS permitted to be async. Every other construct — providers, views, screens, states — operates synchronously within the system boundary. When a component needs data from outside the system, it does so through an adapter, and the async concern is contained there.

This rule has a direct consequence for how the system is modelled. A state that needs to wait for an external response uses an adapter directly and produces its output context only when the adapter resolves. The adapter handles the async; the state handles the transition.

## Examples

A notifications adapter with state for tracking delivery status:

```wds title="NotificationsModule/adapters/NotificationsAdapter.wds"
module NotificationsModule
adapter NotificationsAdapter "Connects to the push notification service" (
    props (
        serviceUrl(string),
        apiKey(string)
    )
    state (
        deviceToken(?string),
        isRegistered(boolean) is false
    )
    interface (
        register deviceId(string) returns(string)
            "Registers the device and returns a push token"
        send notification(Notification) returns(boolean)
            "Sends a push notification; returns true on success"
        unregister
            "Removes the device registration"
    )
)
```

A storage adapter bridging the system to local device storage:

```wds title="StorageModule/adapters/StorageAdapter.wds"
module StorageModule
adapter StorageAdapter "Reads and writes data to local device storage" (
    props (
        namespace(string)
    )
    interface (
        get key(string) returns(?string)
            "Reads a value from storage by key"
        set key(string) value(string)
            "Writes a value to storage"
        remove key(string)
            "Removes a value from storage by key"
        clear
            "Clears all values in the adapter's namespace"
    )
)
```

## File Location

Each adapter lives in its own file under the `adapters` directory of its owning module:

```
/my-project/
  AuthModule/
    AuthModule.wds
    adapters/
      AuthAdapter.wds
    interfaces/
      AccountCredentials.wds
      SystemUser.wds
      SessionToken.wds
```

The file is named after the adapter it defines.

## Relationship to Other Constructs

An adapter is used by a `state` or consumed by a `provider` through its `props`. It is the only construct permitted to perform I/O and the only one permitted to be async — all external communication in the system flows through adapters.

An adapter exposes its methods through `interface`. Its method parameter and return types can be primitives, interface components, lists, maps, optional values, or other declared types. Its internal `state` is not accessible from outside — it is the adapter's own concern.
