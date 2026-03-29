---
title: Screen
---

# Screen

A `screen` is the top-level UI unit in a WORDS specification. It is the equivalent of a screen in a mobile application or a page in a web application — the full visual surface the user sees when a module is in a given state. A screen controls what is rendered, what is visible under which conditions, and what actions the user can take.

A screen is always used by a state. It is never used by another component.

## Purpose

A screen's role is to control the UI for the duration of a state. It reads from the state's context, decides what to render based on it, and wires user interactions back to the state through `state.return()`. Everything visible to the user while the module is in that state is the screen's responsibility.

A screen does not implement logic. It does not compute data, perform I/O, or make decisions about what happens next — those concerns belong to providers, adapters, and the process respectively. A screen reads what the state gives it and expresses it.

## Syntax

The `screen` keyword is followed by a name in PascalCase, an optional description in quotes, and a body in parentheses. The body contains a `uses` block listing everything the screen activates:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen "The sign-in surface for unauthenticated users" (
    uses (
        view AppUIModule.HeaderSection,
        view UIModule.LoginForm (
            onSubmit callback is (
                state.return(AccountCredentials)
            )
        )
    )
)
```

The `module` declaration on the line above is the ownership declaration — it binds this screen to its module.

## Accessing State

A screen has implicit access to the full state object. Two properties are available everywhere inside the screen:

**`state.context`** — the context the state received on entry. The screen reads from it to decide what to render and what data to pass to child views:

```wds
view UIModule.UserGreeting name is state.context.fullName
```

**`state.return()`** — the mechanism through which the screen drives a state transition. Passing a context name to `state.return()` produces that context and triggers the corresponding `when` rule in the process:

```wds
view UIModule.LogoutButton (
    onPress callback is (
        state.return(SignOutRequest)
    )
)
```

Both are available anywhere inside the screen's `uses` block — in direct mounts, in conditional blocks, and inside nested view arguments.

## Conditional Rendering

A screen adapts what it uses based on the state's received context. The `if` keyword conditionally activates a component when the context matches:

```wds title="AuthModule/screens/LoginScreen.wds"
module AuthModule
screen LoginScreen (
    uses (
        if state.context is AccountDeauthenticated (
            view UIModule.Notification type is "warning", message is state.context.reason
        )

        if state.context is AccountRecovered (
            view UIModule.Notification type is "success", message is state.context.message
        )

        view UIModule.LoginForm (
            onSubmit callback is (
                state.return(AccountCredentials)
            )
        )
    )
)
```

The same screen renders differently depending on how the state was entered — with a warning if the user was deauthenticated, with a success message if they just recovered their account, and with neither if they arrive cold. The state machine determines the condition; the screen responds to it.

For the full conditional and iteration syntax, see [Components](/words/docs/components).

## Examples

A screen that mounts a loading indicator while authentication is in progress:

```wds title="AuthModule/screens/AuthenticatingScreen.wds"
module AuthModule
screen AuthenticatingScreen "Shown while credentials are being verified" (
    uses (
        view UIModule.LoadingSpinner,
        view UIModule.StatusMessage text is "Verifying your credentials"
    )
)
```

A screen for an active session with navigation and user-specific content:

```wds title="SessionModule/screens/ActiveSessionScreen.wds"
module SessionModule
screen ActiveSessionScreen "The main surface for an authenticated user" (
    uses (
        view AppUIModule.NavigationBar (
            currentUser is state.context.fullName
        ),
        view AppUIModule.MainContent,
        view UIModule.LogoutButton (
            onPress callback is (
                state.return(SignOutRequest)
            )
        )
    )
)
```

A screen that iterates over a collection and renders a card for each item:

```wds title="NotificationsModule/screens/NotificationsScreen.wds"
module NotificationsModule
screen NotificationsScreen "Lists all notifications for the current user" (
    uses (
        view UIModule.PageHeader title is "Notifications",

        for state.context.notifications as notification (
            view UIModule.NotificationCard (
                message is notification.message,
                type is notification.type,
                onDismiss callback is (
                    state.return(NotificationDismissed)
                )
            )
        )
    )
)
```

## File Location

Each screen lives in its own file under the `screens` directory of its owning module:

```
/my-project/
  AuthModule/
    AuthModule.wds
    screens/
      LoginScreen.wds
      AuthenticatingScreen.wds
    states/
      Unauthenticated.wds
      StartAuthenticating.wds
```

The file is named after the screen it defines.

## Relationship to Other Constructs

A screen is used by a `state`. The state determines when the screen is active and what context it receives. A screen cannot be used by any other component.

A screen uses `view` components, passing them data from `state.context` and wiring their interactions to `state.return()`. Views have no access to the state — the screen is the only point of contact between the state and the view tree.

A screen can reference components from other modules using their qualified name — `ModuleName.ComponentName` — provided those components are exposed by their module.
