---
title: Interface
---

# Interface

An `interface` is a contract component — a named, typed construct for anything that does not fit the role of a screen, view, provider, or adapter. It can represent a data model, a helper, a handler shape, a callable contract, or any other typed concept the system needs to name explicitly.

An `interface` component is distinct from the `interface` block that appears inside a module definition. The module-level `interface` block declares a module's API — what other modules can call or implement. The `interface` component is a construct in its own right, with its own `props`, `state`, and `uses`, that lives in the component layer alongside screens, views, providers, and adapters.

## Purpose

An `interface` component gives a name and a shape to concepts that exist in the system but don't perform I/O, don't render UI, and don't compute derived data. A `Product` model, a `CatalogueFilter` helper, a `RouteSwitchHandler` callback shape — these are all `interface` components. They are the typed vocabulary the rest of the system uses.

Because every other component's `interface` block declares parameter and return types using named constructs, `interface` components are what give those types their shape. A provider that returns `list(Product)` depends on `Product` being defined as an `interface` component somewhere in the module.

## Syntax

The `interface` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body declares `props`, optionally `state`, any methods the contract exposes, and optionally a `uses` block:

```wds title="ProductsModule/interfaces/Product.wds"
module ProductsModule
interface Product "Represents a single product in the catalogue" (
    props (
        id(string)
        name(string)
        price(float)
        description(string)
        imageUrl(string)
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this interface to its module.

## `props`

`props` declares the typed properties that define the shape of the contract. For a data model, these are the fields — accessible via dot notation anywhere the interface is referenced. For a helper or handler, these are the parameters it expects:

```wds title="ProductsModule/interfaces/Product.wds"
module ProductsModule
interface Product "Represents a single product in the catalogue" (
    props (
        id(string)
        name(string)
        price(float)
        description(string)
        imageUrl(string)
    )
)
```

A component that receives a `Product` can access its fields directly — `product.name`, `product.price`, `product.id` — the same way `state.context` properties and `props` properties are accessed elsewhere in the language.

```wds title="CartModule/interfaces/CartItem.wds"
module CartModule
interface CartItem "Represents a single item in the shopping cart" (
    props (
        productId(string)
        name(string)
        quantity(integer)
        unitPrice(float)
        totalPrice(float)
    )
)
```

```wds title="CatalogueModule/interfaces/CatalogueFilter.wds"
module CatalogueModule
interface CatalogueFilter "Defines the shape of a filter applied to the catalogue" (
    props (
        category(?string)
        minPrice(?float)
        maxPrice(?float)
        inStockOnly(boolean) is false
    )
)
```

## Methods

An `interface` component can expose methods directly in its body after `props`. Methods declare behavior — actions the contract can perform or values it can compute — not data access. Data access is handled through `props` directly via dot notation. Each method is named, lists its parameters if any, and declares a return type if it produces one:

```wds title="RoutingModule/interfaces/Router.wds"
module RoutingModule
interface Router "A callable routing contract" (
    props (
        basePath(string)
    )
    navigate path(string)
        "Navigates to the given path"
    back
        "Navigates to the previous path"
    getCurrentPath returns(string)
        "Returns the current active path"
)
```

A method that produces no output omits `returns`. A method that takes no parameters lists only its name and description.

## `state`

`state` declares private instance-level data the interface component owns and manages internally. It is not accessible from outside — it is exposed only through the methods the component declares:

```wds title="OrdersModule/interfaces/OrderDetail.wds"
module OrdersModule
interface OrderDetail "Represents a fully detailed order" (
    props (
        id(string)
        placedAt(integer)
        status(string)
        total(float)
    )
    state (
        items(list(OrderItem)) is []
        shippingAddress(?ShippingAddress)
    )
    uses (
        adapter system.OrdersModule.OrdersAdapter.loadOrderItems orderId is props.id,
            onLoad is (
                state.items is items
            ),
        adapter system.OrdersModule.OrdersAdapter.loadShippingAddress orderId is props.id,
            onLoad is (
                state.shippingAddress is shippingAddress
            )
    )
    getItems returns(list(OrderItem))
        "Returns the order items once loaded"
    getShippingAddress returns(?ShippingAddress)
        "Returns the shipping address once loaded"
)
```

When the adapter method resolves, `onLoad` fires and receives the adapter's return value. The parameter name inside the callback body is inferred from the adapter method's return type signature. The body assigns it directly into the interface's `state` using the standard `is` keyword. The methods `getItems` and `getShippingAddress` expose that state to the outside. The consumer calls the methods without any knowledge of how or when the data was fetched — the interface component manages its own lifecycle entirely.

## `uses`

A `uses` block activates adapters or providers that supply the interface component's internal data. Each adapter call declares an `onLoad` argument whose body fires when the adapter resolves. The parameter name is inferred from the adapter method's return type signature, and the body assigns it directly into `state`:

```wds
onLoad is (
    state.<field> is <name>
)
```

- `<n>` — the identifier inferred from the adapter method’s return type, available inside the callback body
- `state.<field>` — the state field to write into
- `is` — the assignment operator, consistent with the rest of the language

A full example:

```wds title="ProductsModule/interfaces/ProductDetails.wds"
module ProductsModule
interface ProductDetails "Loads and exposes full product details" (
    props (
        id(string)
    )
    state (
        reviews(list(ProductReview)) is []
        relatedProducts(list(Product)) is []
    )
    uses (
        adapter system.ProductsModule.ProductsAdapter.loadReviews productId is props.id,
            onLoad is (
                state.reviews is reviews
            ),
        adapter system.ProductsModule.ProductsAdapter.loadRelated productId is props.id,
            onLoad is (
                state.relatedProducts is relatedProducts
            )
    )
    getReviews returns(list(ProductReview))
        "Returns the product reviews once loaded"
    getRelatedProducts returns(list(Product))
        "Returns the related products once loaded"
)
```

The parameter name inside the callback body is inferred from the adapter method's return type and is scoped to that body alone.

## Module-Level Use

Beyond the component layer, `interface` plays a role in cross-module communication. A module can declare a handler interface — a contract that other modules implement and register against. When the owning module fires the event, every registered handler is called.

A module declares the handler interface in its own definition:

```wds title="RoutingModule/RoutingModule.wds"
module RoutingModule (
    interface RouteSwitchHandler (
        switch path(string) (
            if path is "/home"
                enter Home "The /home path activates the home screen"
        )
    )
)
```

Another module implements it and registers itself:

```wds title="ProductsModule/ProductsModule.wds"
module ProductsModule (
    implements RoutingModule.RouteSwitchHandler (
        switch path(string) (
            if path is "/products"
                enter ProductList "The /products path activates the product list"
        )
    )

    system.RoutingModule.subscribeRoute path is "/products", handler is ProductsModule
)
```

This is the subscription pattern — a module declares the shape of the callback, other modules implement it and register themselves, and the owning module fires the event to all registered handlers. Adding a new module never requires touching an existing one.

## Examples

A data model whose fields are accessed via dot notation:

```wds title="SessionModule/interfaces/AuthSession.wds"
module SessionModule
interface AuthSession "Represents an active session token" (
    props (
        token(string)
        expiresAt(integer)
        userId(string)
    )
)
```

A typed error contract:

```wds title="AuthModule/interfaces/AuthenticationError.wds"
module AuthModule
interface AuthenticationError "Represents an authentication failure" (
    props (
        code(string)
        reason(string)
    )
)
```

A callable contract that exposes behavior through methods:

```wds title="SharedModule/interfaces/Pagination.wds"
module SharedModule
interface Pagination "A callable pagination contract" (
    props (
        page(integer) is 0
        pageSize(integer) is 20
        total(integer)
    )
    nextPage
        "Advances to the next page"
    previousPage
        "Goes back to the previous page"
    goToPage page(integer)
        "Navigates to a specific page"
    hasMore returns(boolean)
        "Returns true if there are more pages"
)
```

## File Location

Each interface component lives in its own file under the `interfaces` directory of its owning module:

```
/my-project/
  ProductsModule/
    ProductsModule.wds
    interfaces/
      Product.wds
      CatalogueFilter.wds
  CartModule/
    interfaces/
      CartItem.wds
  OrdersModule/
    interfaces/
      OrderDetail.wds
      OrderItem.wds
      OrderSummary.wds
  SharedModule/
    interfaces/
      Pagination.wds
```

The file is named after the interface it defines.

## Relationship to Other Constructs

An `interface` component can be used by a `state`, a `screen`, a `view`, a `provider`, or an `adapter`. It provides the typed vocabulary — models, helpers, handler shapes, callable contracts — that all other components reference in their own `props` and method declarations.

At the module level, `interface` is also the mechanism through which modules expose APIs and declare subscription contracts. This is a different role from the component — it is the module's boundary, not a construct that lives in the component layer — but both share the same keyword and the same principle: a named, typed shape that the rest of the system can depend on.
