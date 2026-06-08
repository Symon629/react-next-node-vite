import tv4 from "tv4"
import stateSchema from "./stateSchema"

export default ({ dispatch, getState }) => next => action => {
    next(action)

    // tv4 has a vlaidation function that will take in
    // the first parameter is the object is actual object you want to validate
    // the second parameter is the jsonSchema you want to validate against. 
    console.log(tv4.validate(getState(), stateSchema))


}