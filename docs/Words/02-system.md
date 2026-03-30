---
title: System
---

# System

The `system` construct is the entry point of every WORDS specification. It names the application, gives it a human-readable description and declares the modules from which the application is composed. There is exactly one `system` in a WORDS project.

## Purpose

`system` does not describe behavior, states, transitions or data. Its role is organisational: it breaks the application into named modules, each responsible for a distinct major functionality, so that any change — whether to a specification or an implementation — can live within the context of that specific functionality.

An engineer reading a `system` block can understand the shape of the entire application — what functionalities it contains, how many there are, what they are called — without reading anything else.

## Runtime Access

Beyond naming and listing modules, `system` exposes runtime access to them — such as `system.RoutingModule` — and provides a built-in interface for persisting contexts across module boundaries. The interface exposes three methods: `getContext`, which retrieves a stored context by name, `setContext`, which stores one, and dropContext() which removes the stored context entirely. These are the only behavioral concerns that live at the `system` level. Everything else belongs to the modules themselves.

The `system.` prefix is used wherever a reference is resolved at runtime through the module registry, rather than declared as a static design-time dependency. A state using an adapter within its own module, or a screen referencing a view from another module, are design-time dependencies and use the qualified name alone — `ModuleName.ComponentName`. A call that must be dispatched through the system at runtime — such as `system.setContext`, `system.RoutingModule.dispatch`, or an interface component loading data from another module's adapter — uses the `system.` prefix to signal that resolution happens through the registry, not statically.

## Syntax
```wds title="SystemName.wds"
system SystemName "A description of the application" (
    modules (
        ModuleOne
        ModuleTwo
        ModuleThree
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

The `system` keyword is followed by the application's name, an optional description in quotes and a body in parentheses. Inside the body, the `modules` block lists every module in the application by name, one per line. The `interface` describes what the system exposes to every module.

The description is optional but recommended — it is the first thing any reader, human or model, will see when opening the specification.

## File Location

The `system` construct lives in a single file at the root of the WORDS project:
```
/my-project/SystemName.wds
```

This file should be named after the system name followed by the `.wds` extension and needs to sit at the root of the project's directory. Every other construct in the project belongs to a module and is organised within its module's directory.

## Examples

A minimal single-module application:
```wds title="NotesApp.wds"
system NotesApp "A personal note-taking application" (
    modules (
        NotesModule
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

A mid-size product covering authentication, session management, routing and catalogue functionality:
```wds title="ShopFront.wds"
system ShopFront "An e-commerce storefront" (
    modules (
        RoutingModule
        AuthModule
        SessionModule
        CatalogueModule
        CartModule
        CheckoutModule
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

A back-office tool focused on data processing:
```wds title="ReportingService.wds"
system ReportingService "Internal data reporting and export service" (
    modules (
        IngestionModule
        TransformModule
        ExportModule
        SchedulerModule
    )

    interface (
        getContext name(string) returns(context) "Retrieves the value of a stored context by its name"
        setContext name(string) value(context) "Stores a context by name"
        dropContext name(string) "Clears a context identified by name"
    )
)
```

In each case, the `system` block communicates the scope of the application. The module names signal the functionalities involved. Nothing about how those functionalities behave needs to be understood here — that is the responsibility of each module individually.

## Relationship to Other Constructs

Every module listed in the `modules` block must have a corresponding module definition in the project root directory as the `system` construct does not define them and only declares that they exist.

The `system` file rarely needs to change. New behavior is added by creating or modifying modules. The `system` file is only updated when a module is added to or removed from the application entirely.
