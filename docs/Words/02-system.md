---
title: System
---

# System

The `system` construct is the entry point of every WORDS specification. It names the application, gives it a human-readable description, and declares the modules from which the application is composed. There is exactly one `system` in a WORDS project.

## Purpose

`system` does not describe behavior, states, transitions or data. Its role is organisational: it breaks the application into named modules, each responsible for a distinct major functionality, so that any change — whether to a specification or an implementation — can live within the context of that specific functionality.

An engineer reading a `system` block can understand the shape of the entire application — what functionalities it contains, how many there are, what they are called — without reading anything else.

## Syntax

```wds
system SystemName "A description of the application" (
    modules (
        ModuleOne
        ModuleTwo
        ModuleThree
    )
)
```

The `system` keyword is followed by the application's name, an optional description in quotes, and a body in parentheses. Inside the body, the `modules` block lists every module in the application by name, one per line.

The description is optional but recommended — it is the first thing any reader, human or model, will see when opening the specification.

## File Location

The `system` construct lives in a single file at the root of the WORDS project:

```
/words/system.wds
```

This file is always named `system.wds` and always sits at the root of the `/words/` directory. Every other construct in the project belongs to a module and is organised beneath it. The `system` file is the only construct with a fixed location.

## Examples

A minimal single-module application:

```wds
system NotesApp "A personal note-taking application" (
    modules (
        NotesModule
    )
)
```

A mid-size product covering authentication, session management, routing, and catalogue functionality:

```wds
system ShopFront "An e-commerce storefront" (
    modules (
        AppModule
        RoutingModule
        AuthModule
        SessionModule
        CatalogueModule
        CartModule
        CheckoutModule
    )
)
```

A back-office tool focused on data processing:

```wds
system ReportingService "Internal data reporting and export service" (
    modules (
        AppModule
        IngestionModule
        TransformModule
        ExportModule
        SchedulerModule
    )
)
```

In each case, the `system` block communicates the scope of the application. The module names signal the functionalities involved. Nothing about how those functionalities behave needs to be understood here — that is the responsibility of each module individually.

## What It Does Not Contain

`system` does not describe what happens when the application launches — that is the responsibility of `AppModule`, which is present in every WORDS application and handles system-level concerns such as module access and context persistence.

The `system` construct intentionally contains as little as possible. Its job is to name and enumerate. Everything else belongs elsewhere.

## Relationship to Other Constructs

Every module listed in the `modules` block must have a corresponding module definition elsewhere in the project as the `system` construct does not define them and only declares that they exist.

This means the `system` file rarely needs to change. New behavior is added by creating or modifying modules. The `system` file is only updated when a module is added to or removed from the application entirely.
