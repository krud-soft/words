---
title: Provider
---

# Provider

A `provider` computes and exposes in-memory derived data to other components. It does not perform I/O — it works only with data already available within the system, transforming it into models, collections, or other shaped contracts that screens, views, and other components can consume.

## Purpose

A provider's role is to own the computation and representation of data inside the system boundary. Where an adapter brings data in from the outside, a provider works with what is already there — normalising it, filtering it, aggregating it, or mapping it into a form that is ready for display or further processing.

A provider exposes its data through an `interface`, which declares the methods other components can call. It receives its dependencies through `props` — adapters, other interfaces, or configuration values — and maintains its own in-memory `state` for data it needs to hold between calls.

## Syntax

The `provider` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body declares `props`, `state`, and `interface`:

```wds title="ProductsModule/providers/ProductsProvider.wds"
module ProductsModule
provider ProductsProvider "Supplies product data to the products UI" (
    props (
        productsAdapter(ProductsAdapter)
    )
    state (
        products(list(Product)) is []
        selectedProduct(?Product)
    )
    interface (
        getProducts returns(list(Product))
            "Returns the full list of available products"
        getSelectedProduct returns(Product)
            "Returns the currently selected product"
        selectProduct product(Product)
            "Sets the selected product"
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this provider to its module.

## `props`

`props` declares the dependencies the provider receives at initialisation. These are typically adapters that perform the I/O the provider depends on, or interface components that supply typed data contracts:

```wds title="SessionModule/providers/SessionProvider.wds"
module SessionModule
provider SessionProvider "Manages the active session and exposes user data" (
    props (
        sessionAdapter(SessionAdapter)
        userModel(UserModel)
    )
    interface (
        getActiveSession returns(SessionToken)
            "Returns the current active session token"
        getCurrentUser returns(UserModel)
            "Returns the authenticated user"
    )
)
```

A provider never performs I/O directly. When it needs external data, it delegates to an adapter received through `props`.

## `state`

`state` declares the in-memory data the provider owns and manages internally. It is not visible to other components directly — it is exposed only through the `interface`. Each entry is typed and can declare a default value with `is`. An entry that may be absent is marked with `?` — no default value is needed:

```wds title="CatalogueModule/providers/CatalogueProvider.wds"
module CatalogueModule
provider CatalogueProvider "Manages the product catalogue and search results" (
    props (
        catalogueAdapter(CatalogueAdapter)
    )
    state (
        catalogue(list(CatalogueItem)) is []
        searchResults(list(CatalogueItem)) is []
        activeFilter(?CatalogueFilter)
    )
    interface (
        getCatalogue returns(list(CatalogueItem))
            "Returns the full product catalogue"
        getSearchResults returns(list(CatalogueItem))
            "Returns the current search results"
        search query(string)
            "Filters the catalogue by the given query"
        applyFilter filter(CatalogueFilter)
            "Applies a filter to the catalogue"
    )
)
```

## `interface`

`interface` declares the methods the provider exposes to other components. Each method is named, lists its parameters if any, and declares its return type if it produces one. Return types are `interface` components — models, collections, or any other named, typed contract defined elsewhere in the module or referenced from another:

```wds title="CartModule/providers/CartProvider.wds"
module CartModule
provider CartProvider "Manages the shopping cart contents and totals" (
    props (
        cartAdapter(CartAdapter)
    )
    state (
        items(list(CartItem)) is []
        total(float) is 0
    )
    interface (
        getItems returns(list(CartItem))
            "Returns all items currently in the cart"
        getTotal returns(float)
            "Returns the current cart total"
        addItem item(CartItem)
            "Adds an item to the cart"
        removeItem item(CartItem)
            "Removes an item from the cart"
        clear
            "Empties the cart"
    )
)
```

A method that produces no output omits the `returns` clause. A method that takes no parameters lists only its name and description.

## Examples

A provider that normalises data from an adapter into a display-ready model:

```wds title="OrdersModule/providers/OrdersProvider.wds"
module OrdersModule
provider OrdersProvider "Supplies order history and order detail to the orders UI" (
    props (
        ordersAdapter(OrdersAdapter)
    )
    state (
        orders(list(OrderSummary)) is []
        activeOrder(?OrderDetail)
    )
    interface (
        getOrders returns(list(OrderSummary))
            "Returns the list of past orders"
        getActiveOrder returns(OrderDetail)
            "Returns the currently selected order in full detail"
        selectOrder id(string)
            "Sets the active order by id"
    )
)
```

A provider that aggregates data from multiple adapters:

```wds title="DashboardModule/providers/DashboardProvider.wds"
module DashboardModule
provider DashboardProvider "Aggregates data from multiple sources for the dashboard" (
    props (
        analyticsAdapter(AnalyticsAdapter)
        notificationsAdapter(NotificationsAdapter)
    )
    state (
        metrics(?DashboardMetrics)
        notifications(list(Notification)) is []
    )
    interface (
        getMetrics returns(DashboardMetrics)
            "Returns the current dashboard metrics"
        getNotifications returns(list(Notification))
            "Returns all active notifications"
        dismissNotification id(string)
            "Dismisses a notification by id"
    )
)
```

## File Location

Each provider lives in its own file under the `providers` directory of its owning module:

```
/my-project/
  ProductsModule/
    ProductsModule.wds
    providers/
      ProductsProvider.wds
    adapters/
      ProductsAdapter.wds
    interfaces/
      Product.wds
      CatalogueFilter.wds
```

The file is named after the provider it defines.

## Relationship to Other Constructs

A provider is used by a `state` or consumed by another component through its `interface`. It receives adapters and interface components through `props` and delegates all I/O to them — a provider never performs I/O directly.

A provider exposes its data through `interface` methods whose return types are `interface` components — models, collections, or other typed contracts defined in the module. Its internal `state` is not accessible directly from outside — only through the methods the `interface` declares.
