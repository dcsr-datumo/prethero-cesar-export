const { DaSCH } = require("./lib/DaSCH.js");
const { Performance } = require("./Performance.js");
const { readFileSync, writeFileSync } = require('fs');
const { Place } = require("./Place.js");
const { ThingPerformed } = require("./ThingPerformed.js");
const { PerformancePerson } = require("./PerformancePerson.js");
const { Author } = require("./Author.js");
const { Carrier } = require("./Carrier.js");

// read the gravsearch request
const req_performances = readFileSync('./request/performances.rq');

let dasch = new DaSCH();
let performancesRaw = [];

const recurse = (offset) => {
    console.log("request all performances, offset: ", offset, ", number of performances: ", performancesRaw.length);
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
                    performancesRaw.push(...graph);
                }
            }
            // // debug:
            // return performancesRaw;
            // if more are to come
            if (data.hasOwnProperty("knora-api:mayHaveMoreResults") && data["knora-api:mayHaveMoreResults"] === true) {
                // return the promise of the next page (to be processed here)
                return recurse(++offset);
            } else {
                // of all the pages (to be processed by the outer `rec(0).then()`)
                return performancesRaw;
            }
        }
    );
}

let allPerformances = {};

// request all performances
recurse(0)
    .then(
        // result is a list of performance iri and label
        (allPerformancesRaw) => {
            let requestAllPerformances = allPerformancesRaw.map(
                (performanceRaw) => {
                    // fill the list of all performances `allPerformances`
                    // with basic performance informations
                    let performance = new Performance(performanceRaw);
                    // create a request for getting the performances themselves
                    return new Promise(
                        (resolve, reject = (error) => { throw error; }) => {
                            dasch.getResource(performance.getId(), (raw) => { resolve([performance, raw]); }, reject);
                        }
                    );
                }
            );

            // concurrent request all
            return Promise.all(requestAllPerformances);
        }
    )
    .then(
        (performancesRaws) => {
            return performancesRaws.filter(
                (performanceRaw) => {
                    try {
                        return (DaSCH.getListNodeId(performanceRaw[1], "prethero:isCancelled") != "http://rdfh.ch/lists/0119/A7dQhIkMTKmdhjM10tCDGw");
                    } catch (error) {
                        return true;
                    }
                }
            )
        }
    )
    .then(
        // input: page = array of dasch 25 * get resource
        // parse them
        (performancesRaws) => {
            // switch a page of performancesRaw
            // for a page of Promises to fetch these performances lists and links properties
            let nextReqs = performancesRaws.map(
                (performanceRaw) => {
                    [performance, raw] = performanceRaw;

                    allPerformances[performance.getId()] = performance;
                    return performance.parseListsAndLinks(raw, dasch);
                }
            )
            return Promise.all(nextReqs);
        }
    )
    .catch(function (error) {
        console.log(error);
    })
    // .then(
    //     (performances) => { allPerformances.push(...performances); }
    // )
    .finally(
        () => {
            console.log(allPerformances);

            let output_perfpersons = {};
            // resolve script promises
            Object.entries(PerformancePerson.cache).map(entry => entry[1]).reduce((current, next) => {
                return current.then((perfperson) => {
                    output_perfpersons[perfperson.getId()] = perfperson;
                    return next;
                });
            }).then(
                (perfperson) => {
                    output_perfpersons[perfperson.getId()] = perfperson;
                    console.log("writing export_perfpersons.json");
                    writeFileSync('../result/export_perfpersons.json', JSON.stringify(output_perfpersons));
                }
            ).finally(
                () => {
                    let output_scripts = {};
                    // resolve script promises
                    Object.entries(ThingPerformed.cache).map(entry => entry[1]).reduce((current, next) => {
                        return current.then((script) => {
                            output_scripts[script.getId()] = script;
                            return next;
                        });
                    }).then(
                        (script) => {
                            output_scripts[script.getId()] = script;
                            console.log("writing export_scripts.json");
                            writeFileSync('../result/export_scripts.json', JSON.stringify(output_scripts));
                        }
                    ).finally(
                        () => {
                            let output_persons = {};
                            // resolve person promises
                            Object.entries(Author.cache).map(entry => entry[1]).reduce((current, next) => {
                                return current.then((author) => {
                                    output_persons[author.getId()] = author;
                                    return next;
                                });
                            }).then(
                                (author) => {
                                    output_persons[author.getId()] = author;
                                    console.log("writing export_persons.json");
                                    writeFileSync('../result/export_persons.json', JSON.stringify(output_persons));
                                }
                            ).finally(
                                () => {
                                    let output_carriers = {};
                                    // resolve carrier promises
                                    Object.entries(Carrier.cache).map(entry => entry[1]).reduce((current, next) => {
                                        return current.then((carrier) => {
                                            output_carriers[carrier.getId()] = carrier;
                                            return next;
                                        });
                                    }).then(
                                        (carrier) => {
                                            output_carriers[carrier.getId()] = carrier;
                                            console.log("writing export_carriers.json");
                                            writeFileSync('../result/export_carriers.json', JSON.stringify(output_carriers));
                                        }
                                    ).finally(
                                        () => {
                                            let output_places = {};
                                            // resolve place promises
                                            Object.entries(Place.cache).map(entry => entry[1]).reduce((current, next) => {
                                                return current.then((place) => {
                                                    output_places[place.getId()] = place;
                                                    return next;
                                                });
                                            }).then(
                                                (place) => {
                                                    output_places[place.getId()] = place;
                                                    console.log("writing export_place.json");
                                                    writeFileSync('../result/export_place.json', JSON.stringify(output_places));
                                                }
                                            ).finally(
                                                () => {
                                                    allPromises = [];
                                                    Object.entries(allPerformances).forEach((entry) => {
                                                        let [performance_id, performance] = entry;
                                                        if (
                                                            performance.performance_person_ids && performance.performance_person_ids.length > 0 &&
                                                            (!performance.performance_person_id || performance.performance_person_id.length == 0)
                                                        ) {
                                                            performance.performance_person_ids.forEach((perfPersid) => {
                                                                if (perfPersid in PerformancePerson.cache) {
                                                                    allPromises.push(
                                                                        PerformancePerson.cache[perfPersid].then(
                                                                            (performance_person) => {
                                                                                return performance_person.isAttachedToAPerson().then(
                                                                                    (isAttached) => {
                                                                                        console.log("person: "+ performance_person.sources +", isPerson: "+ isAttached);
                                                                                        if(isAttached) {
                                                                                            performance.performance_person_id.push(performance_person.sources);
                                                                                            return Promise.resolve(performance_person);
                                                                                        }
                                                                                    }
                                                                                );
                                                                            }
                                                                        )
                                                                    );
                                                                }
                                                            });
                                                        }
                                                    });
                                                    Promise.all(allPromises).then(
                                                        (item) => {
                                                            console.log("processing : "+ item);
                                                        }
                                                    ).finally(
                                                        () => {
                                                            Object.entries(allPerformances).forEach((entry) => {
                                                                let [performance_id, performance] = entry;
                                                                if (performance.performance_person_id && performance.performance_person_id.length == 0) {
                                                                    delete performance.performance_person_id;
                                                                }
                                                            });
                                                            console.log("writing export.json");
                                                            writeFileSync('../result/export.json', JSON.stringify(allPerformances));
                                                        }
                                                    )
                                                }
                                            );
                                        }
                                    );
                                }
                            )
                        }
                    )
                }
            )
        }
    )
