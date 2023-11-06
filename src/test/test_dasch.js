const { DaSCH } = require("../lib/DaSCH.js");
const { Place } = require("../Place.js");
const { readFileSync } = require('fs');

// read the gravsearch request
const req_performances = readFileSync('../request/performances.rq');

function test_search_result(data, logger) {
    if (!logger) { logger = console.log; }
    logger(data);
    if (!data.hasOwnProperty("@graph")) {
        logger("no data!")
        throw new Error("request fails");
    }
}

function test_search_resource(data, logger) {
    if (!logger) { logger = console.log; }
    logger(data);
    if (!data.hasOwnProperty("@id")) {
        logger("no data!")
        throw new Error("request fails");
    }
}

function test_search_async() {
    let dasch = new DaSCH();
    let data = dasch.search(req_performances + " OFFSET 0", test_search_result);
    if (data) {
        throw new Error("async call, data is expected to be undefined")
    }
}

function test_search_async_promise() {
    let dasch = new DaSCH();
    let search = new Promise((resolve, reject = (error) => { throw error; }) => {
        dasch.search(req_performances + " OFFSET " + 0, resolve, reject);
    });
    search.then(console.log);
}

function test_search_async_promise_recursive() {
    let dasch = new DaSCH();
    let pages = [];

    const rec = (offset) => {
        console.log("offset: ", offset, ": ", pages);
        // return a promise
        return new Promise((resolve, reject = (error) => { throw error; }) => {
            // returning the json of the response
            dasch.search(req_performances + " OFFSET " + offset, resolve, reject);
        }).then(
            // we process the json
            (data) => {
                // add the page read to the previous pages
                if (data.hasOwnProperty("@graph")) {
                    let graph = data["@graph"];
                    if (graph.length > 0) {
                        // for debug, add pages:
                        pages.push(graph);
                        // in real case:
                        //pages = pages.concat(graph);
                    }
                }
                // if more are to come
                if (data.hasOwnProperty("knora-api:mayHaveMoreResults") && data["knora-api:mayHaveMoreResults"] === true) {
                    // return the promise of the next page (to be processed here)
                    return rec(++offset);
                } else {
                    // of all the pages (to be processed by the outer `rec(0).then()`)
                    return pages;
                }
            }
        );
    }

    rec(0).then(
        console.log
    );
}

function getLogger(name) {
    return (msg) => console.log(name, ": ", msg);
}

function test_search_blocking(offset) {
    const name = "test_search_blocking";
    const logger = getLogger(name + " " + offset);
    logger("-----------------");
    let dasch = new DaSCH();
    let data = {};
    (async () => {
        let data = await new Promise((resolve, reject = (error) => { throw error; }) => {
            dasch.search(req_performances + " OFFSET " + offset, resolve, reject);
        }).catch((error) => {
            logger(error);
        });
        // blocks until data is known
        test_search_result(data, logger);
    })();
}

function default_fail(error) { console.error("offset: " + offset, error); }

function test_search_async(offset) {
    const name = "test_search_async";
    const logger = getLogger(name + " " + offset);
    logger("-----------------");
    let dasch = new DaSCH();
    // should be only:
    // dasch.search(req_performances + " OFFSET 0", test_search_result);
    let data = dasch.search(req_performances + " OFFSET " + offset, test_search_result, default_fail);
    if (data) {
        // check the result is undefined
        throw new Error("async call, data is expected to be undefined")
    }
}

function test_get_resource_async(iri) {
    let dasch = new DaSCH();
    dasch.getResource(iri, test_search_resource, default_fail);
}

function test_get_resource_async_promise(iri) {
    let dasch = new DaSCH();
    let request = new Promise((resolve, reject = (error) => { throw error; }) => {
        dasch.getResource(iri, resolve, reject);
    });
    request.then(console.log);
}

function test_get_list_node(iri) {
    let dasch = new DaSCH();
    let request = new Promise((resolve, reject = (error) => { throw error; }) => {
        dasch.getListNode(iri, resolve, reject);
    });
    request.then(
        (data) => {
            console.log(data);
            if (data != "French") {
                throw new Error("expected `French`, got: " + data);
            }
        }
    );
}

function test_get_list_iri() {
    let goal = "found!";
    let linkTargetProperty = "test:linkProperty";
    let linkTargetData = {
        "test:linkProperty": {
            "knora-api:linkValueHasTarget": {
                "@id": "found!"
            }
        }
    }
    let result = DaSCH.getLinkTargetId(linkTargetData, linkTargetProperty);
    if (result !== "found!") {
        throw new Error("expected: ", goal, ", got: ", result);
    }
}

function assert(expected, result) {
    if (expected && expected !== result) {
        console.log("expected: ", goal, ", got: ", result);
        throw new Error("expected: ", goal, ", got: ", result);
    }
}

function test_get_place_recursive() {
    let placeIri = "http://rdfh.ch/0119/ZrDtv7v5RIGM70-DUe6jqg";
    let dasch = new DaSCH();
    let requests = Place.parsePlaceRecursively(placeIri, dasch)
    requests.then(
        (place) => {
            console.log(place);
            assert("Genève", place.label);
            assert('Canton de Genève', place.parent_id.label);
            assert('Suisse', place.parent_id.parent_id.label);
        }
    )
}

// test simple sync search
// test_search_async(0);

// test simple blocking search
// test_search_blocking(0);

// test async search that fails
// test_search_async(60);

// test blocking search that fails
// test_search_blocking(60);

// test async search using Promise
// test_search_async_promise();

// test async recursive call using Promise
// test_search_async_promise_recursive();

const valid_iri = "http://rdfh.ch/0119/-T9FhIimQfC2X9Jas8dXWg"

// test get a resource that exists
// test_get_resource_async(valid_iri);

// test get a resource that exists using Promise
// test_get_resource_async_promise(valid_iri);

// test get a resource that doesn't exist
// const invalid_iri = "http://rdfh.ch/0119/-T9FhIimQfC2X9Jas8dXWG"
// test_get_resource_async(invalid_iri);

const valid_list_node_iri = "http://rdfh.ch/lists/0119/Qjs18-xrSXW_ygis2yR1iA"

test_get_list_node(valid_list_node_iri);

// test_get_list_iri();

// test_get_place_recursive();