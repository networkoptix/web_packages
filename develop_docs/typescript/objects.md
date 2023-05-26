# Objects in TypeScript

Handbook page: [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)

## Creating objects
When creating an object, TypeScript expects all required properties to be present. This means that
otherwise valid JavaScript will not work in TypeScript.


This is fine in JS:
```js
const pizza = {};
pizza.base = 'olive oil';
pizza.toppings = ['prosciutto', 'arugula'];
pizza.diameter = 10;
```

But will error in TS:
```ts
interface Pizza {
    base: string;
    toppings: string[];
    diameter: number;
}

/* ❌ Type '{}' is missing the following properties from type 'Pizza': base, toppings, diameter */
const pizza: Pizza = {};
pizza.base = 'olive oil';
pizza.toppings = ['prosciutto', 'arugula'];
pizza.diameter = 10;
```

This is by design and the desired behavior since it helps ensure that all expected properties are
actually present. It might seem obvious in this simple example that all the properties will be
there, but in actual code there might be many more properties and many lines between assignments.
The correct thing to do in TS is **construct objects with all the required properties**:

```ts
// Note: Explicitly specifying object type here is usually not required
const pizza: Pizza = {
    base: 'olive oil',
    toppings: ['prosciutto', 'arugula'],
    diameter: 10,
};
```

This also means that **empty/partial objects missing required properties should not be assigned as
initial values**:

```ts
class MyClass {
    // "I'll assign the rest of the properties later"
    pizza: Pizza = { diameter: 10 } as Pizza;
    ...
}

```
This example does another unsafe thing by using `as Pizza` to silence the error about missing
properties. This should not be done, since it essentially turns off the property checking by telling
TS that the developer knows better and to just assume that all the required properties are present,
at which point it's no better than JS.

## Adding properties
In addition to checking that required properties are present, TS also prevents accessing or
assigning to nonexistent properties.

Adding properties via dot notation works in JS:
```js
const cake = {
    cake: 'red velvet',
    diameter: 8,
}

function addFrosting(unfrosted, frosting) {
    unfrosted.frosting = frosting;
    return unfrosted;
}
const frostedCake = addFrosting(cake, 'cream cheese');
```

But not in TS:
```ts
interface UnfrostedCake {
    cake: string;
    diameter: number;
}
interface FrostedCake extends UnfrostedCake {
    frosting: string;
}

const cake = {
    cake: 'red velvet',
    diameter: 8,
}

// Errors in TS
function addFrosting(unfrosted: UnfrostedCake, frosting: string): FrostedCake {
    /* ❌ Property 'frosting' does not exist on type 'UnfrostedCake'. */
    unfrosted.frosting = frosting;
    /* ❌ Property 'frosting' is missing in type 'UnfrostedCake' but required in type 'FrostedCake'. */
    return unfrosted;
}
const frostedCake = addFrosting(cake, 'cream cheese');
```

TS correctly sees that the function is attempting to assign to the `frosting` property on an object
that should not have it. It also correctly sees that the function is attempting to return the
`unfrosted` argument, whose type does not match the function return type. **To add new required
properties, create a new object with the new and old required properties**:
```ts
function addFrosting(unfrosted: UnfrostedCake, frosting: string): FrostedCake {
    return { ...unfrosted, frosting };
}
```

## Optional properties
Optional properties are, as the name implies, properties which aren't required and might or might
not be on an object. Generally these should be used for properties whose presence can't be known
before runtime like data from network requests, or for properties where we don't need to know
whether they're present or not to achieve full typing.

```ts
interface FooBarBaz {
    foo: string;
    bar: string;
    baz?: string;
    // We don't know whether the request will come back with this or not
}

class ApiService {
    ...
    getFooBarBaz(): Promise<FooBarBaz> {
        return this.get('/api/foobarbaz');
    }
}
```

```ts
interface Cupcake {
    cake: string;
    frosting?: string;
}
...
if (cupcake.frosting) {
    if (frosting[cupcake.frosting]) {
        frosting[cupcake.frosting] -= 1;
    } else {
        console.error('😱');
    }
}
// We don't need to know in advance here whether it has the frosting property or not
```

Unfortunately, optional properties are very easy to abuse in the quest to silence TS errors. Below
are some examples of what not to do, the common thread between all of them being either **adding
optional properties that never exist or making properties optional when they are known to always be
present**.

### Adding optional properties instead of extending
✔️ Good: `UserV2` has properties that `User` does not and `.getUser()` can
return either.
```ts
interface User {
    id: string;
    email: string;
}

interface UserV2 extends User {
    name: string;
    location: string;
}

class UserApi {
    getUser(id: string): User | UserV2 { ... }
}
```

❌ Bad: A user from the API will never have only name or location, they will have both or neither.
```ts
interface User {
    id: string;
    email: string;
    name?: string;
    location?: string;
}

class UserApi {
    getUser(id: string): User { ... }
}
```

### Adding optional properties instead of extending 2
✔️ Good: `firstName` and `lastName` are properties which come from processing and not the API.
```ts
interface ApiUserResp {
    id: string;
    fullName: string;
}
interface User extends ApiUserResp {
    firstName: string;
    lastName: string;
}

function processUsers(users: ApiUserResp[]): User[] {
    return users.map(u => {
        const [firstName, lastName] = u.fullName.split(' ');
        return {
            ...u,
            firstName,
            lastName,
        };
    });
}
```

❌ Bad: `firstName` and `lastName` are marked as optional even through they are always present after
processing.
```ts
interface User {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
}

function processUsers(users: User[]): User[] {
    return users.map(u => {
        const [firstName, lastName] = u.fullName.split(' ');
        return {
            ...u,
            firstName,
            lastName,
        };
    });
}
```

### Adding optional properties instead of using two separate types
✔️ Good: Two distinct types with exclusive required properties.
```ts
interface PotPie {
    meat: string;
    veggies: string[];
    sauce: string;
}

interface FruitPie {
    fruit: string;
    aLaMode: boolean;
}
```

❌ Bad: A mishmash of all optional properties.
```ts
interface Pie {
    meat?: string;
    veggies?: string[];
    sauce?: string;
    fruit?: string;
    aLaMode?: boolean;
}
```

### Adding optional properties to enable destructuring
✔️ Good: `recordingDates` is only present on `RecordingCamera`.
```ts
interface LiveCamera {
    id: string;
}

interface RecordingCamera {
    id: string;
    recordingDates: string[];
}

function cameraFunc(camera: LiveCamera | RecordingCamera): void {
    const { id } = camera;
    const { recordingDates = null } = camera as RecordingCamera;
    // This is not the only way to do this (see note)
    ...
}
```

❌ Bad: `LiveCamera` should not have `recordingDates`, but now it can.
```ts
interface LiveCamera {
    id: string;
    recordingDates?: string[]; // This should not be here
}

interface RecordingCamera {
    id: string;
    recordingDates: string[];
}

function cameraFunc(camera: LiveCamera | RecordingCamera): void {
    const { id, recordingDates } = camera;
    ...
}
```

💡 Note: There are several ways to handle getting a property only present on one member of a union.
One way is to use a cast to destructure as seen above, another is its non-destructure equivalent:
```ts
const recordingDates = (camera as RecordingCamera).recordingDates ?? null;
```

Another way is to narrow the type by checking for the property:
```ts
const recordingDates = 'recordingDates' in camera ? camera.recordingDates : null;
```

The benefit of the type narrowing approach is that it is the safest since the syntax requires a
default value, which prevents developers from forgetting to handle if the property isn't there. The
downside is that it is more verbose than the cast to destructure and more difficult to get multiple
properties with.
