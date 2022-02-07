const Apify = require('apify');
const { VM } = require('vm2');
const objPath = require('object-path');

const { log } = Apify.utils;
const vm2 = new VM();

let runContext;

let stringReducerFn = null;

/**
 *
 * @param {Object} state The state to initialize by. Usually best to set as an empty object.
 * @param {Function} userReducer Dev-defined reducer function. See docs for example.
 * @returns {Promise|Error}
 */
const createContext = async (state, userReducer) => {
    try {
        if (!state) throw new Error('Must provide an initial state.');
        if (!userReducer) throw new Error('Must provide a reducer function.');

        const stringReducer = () => {
            return userReducer;
        };

        stringReducerFn = `${stringReducer()}`;

        await Apify.setValue('REDUCER', { stringReducer: `${stringReducer()}` });

        const check = await Apify.getValue('CONTEXT');

        if (check) {
            await Apify.setValue('CONTEXT', check);
            runContext = check;
        } else {
            await Apify.setValue('CONTEXT', { state });
            runContext = state;
        }

        Apify.events.on('migrating', () => {
            Apify.setValue('CONTEXT', runContext);
        });

        Apify.events.on('persistState', () => {
            Apify.setValue('CONTEXT', runContext);
        });

        return setInterval(async () => {
            log.debug('Saving context to KVStore');
            return Apify.setValue('CONTEXT', { state: runContext });
        }, 10000);
    } catch (error) {
        throw new Error(`Failed to createContext: ${error}`);
    }
};

/**
 *
 * @typedef {Array} useContextArray
 * @property {Function} 0 - state: Returns the current state
 * @property {Function} 1 - dispatch: Modifies the state, passes state into your reducer function
 * @property {Function} 2 - push: Pushes the state
 */

/**
 *
 * @returns {Promise<useContextArray>|Error} useContextArray
 */
const useContext = async () => {
    try {
        const stringReducer = stringReducerFn ?? (await Apify.getValue('REDUCER').stringReducer);

        const reducer = vm2.run(stringReducer);

        /**
         *
         * @returns {Object} State object
         */
        const getState = () => {
            return runContext;
        };

        /**
         *
         * @param {Object} action The action object defined by your reducer function
         * @returns {Boolean|Error} True/False based on the function's success
         */
        const dispatch = async (action) => {
            try {
                log.debug('Running a dispatch');

                const newState = reducer(runContext, action);
                runContext = newState;
                return true;
            } catch (error) {
                return new Error(`Failed to dispatch: ${error}`);
            }
        };

        /**
         * @typedef {Object} PushConfig Configuration for push function
         * @property {String} path Path within state to delete (will push this data if data = null)
         * @property {Object} [data] Object to push to dataset (optional)
         */

        /**
         *
         * @param {PushConfig} pushConfig path, data
         * @returns {Promise|Error} Apify.pushData()
         */
        const push = async ({ path, data = null }) => {
            try {
                if (typeof path !== 'string') return new Error('Path must be a string!');
                if (data && typeof data !== 'object') return new Error('Data must be an object or an array of objects!');

                const value = objPath.get(runContext, `${path}`);

                objPath.del(runContext, `${path}`);

                if (data) {
                    return Apify.pushData(data);
                }

                if (typeof value !== 'object') throw new Error('Value being pushed must be an object or an array of objects!');
                return Apify.pushData(value);
            } catch (error) {
                return new Error(`Failed to push state value to dataset: ${error}`);
            }
        };

        return [getState, dispatch, push];
    } catch (error) {
        throw new Error(`Failed to useContext: ${error}`);
    }
};

module.exports = { createContext, useContext };
