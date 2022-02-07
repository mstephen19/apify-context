# apify-context

When developing a complex scraper using the [Apify SDK](https://sdk.apify.com/), passing around data can be quite a hassle. Using `userData` to hold large objects slows down the scraper, and logic must be manually written to persist variable objects of classes during migrations.

## Table of Contents

-   [Notice](#notice)
-   [Features](#features)
-   [Installing](#installing)
-   [Example](#example)
    -   [createContext](#createcontext)
    -   [useContext](#usecontext)

## **NOTICE**

This package **IS NOT** necessary when working with a simple automation/scraping project. It is useful when scraping data which needs multiple requests to be done before it can finally be pushed to a dataset.

For example, in order to scrape the full data of a product on most web-applications, you must:

1.  Make a request to the main product page, scrape and store the general product data
2.  Make another request to the reviews page, add those reviews to the object stored in the previous request
3.  Paginate through the reviews and continue adding the reviews to the stored object's "reviews" array until desired number of reviews has been reached
4.  Finally, push the stored object to the dataset

## Features

-   Familiar syntax for those who already know [React ContextAPI](https://reactjs.org/docs/context.html).
-   Store stateful values which can be accessed globally.
-   Automatically persist your actor's state through `'migrating'` and `'persistState'` events.
-   Factor away complex sorting/filtering/etc algorithms into a reducer function for easier-to-read code.
-   Avoid passing large objects through the `userData` of a request, speeding up your actor's performance.
-   Automatically handle garbage collection of no longer needed state values.

## Installing

Run the command in your terminal within your project to get started:

```
$ npm install apify-context
```

## Example

```JavaScript
// Define our reducer function
const reducer = (state, { type, payload, identifier }) => {
    switch (type) {
        default:
            return state;
        case 'GENERAL':
            return {
                ...state,
                ...payload,
            };
        case 'MODIFY':
            return {
                ...state,
                [identifier]: { ...state[identifier], ...payload }
            }
    }
};

// Initialize our context with an empty object and pass our reducer function in
await createContext({}, reducer);

// Deconstruct our state, dispatch, and push functions from the useContext hook
const [state, dispatch, push] = await useContext();

// Add a new object to our state
dispatch({
    type: 'GENERAL',
    payload: { info: { message: 'hi', age: 20 } },
});

// Change our message for the "info" object to now be "hello world"
dispatch({
    type: 'MODIFY',
    identifier: 'info',
    payload: { message: 'hello world' }
})

// Push our info object to the dataset and delete if from our state
await push({
    path: 'info'
})
```

## createContext

### Parameters

| Param   | Type     | Description                                                                                                                                                    |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| state   | Object   | The value to initialize the state with. If "CONTEXT" already exists in the Key-Value store, that will be used instead. It is best to use an empty object here. |
| reducer | Function | Self-defined reducer function. See example above.                                                                                                              |

### Details

-   **Returns** Promise
-   When this function is called, the `Apify.events.on` functions for `migrating` and `persistState` are automatically called. Additionally, a timeout function is returned, which updates the "CONTEXT" value in the Key-Value store every 10 seconds.

### Usage

```JavaScript
// Current state is automatically passed into the reducer function. The action is defined by us.
const reducer = (state, action) => {
    switch (action.type) {
        default:
            return state;
        case 'GENERAL':
            return {
                ...state,
                ...action.payload,
            };
    }
};

await createContext({}, reducer)
```

## useContext

### Details

-   **Returns** Array:
    -   `state`: Retrieve the current state
    -   `dispatch`: Your reducer function with the state passed into it
    -   `push`: Push a value in the state to the dataset, then delete if from the state

### Usage

```JavaScript
const [state, dispatch, push] = await useContext()

// Retrieve our state
console.log(state())

// Add to our state
dispatch({
    type: 'GENERAL',
    payload: { test: { myObject: { msg: 'hello world' } } }
})

// Push data to the dataset then delete it
await push({
    // Define the path of the object/array of objects we want to push (in string form)
    path: 'test.myObject'
})
```
