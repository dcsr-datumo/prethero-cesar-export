const { error, log } = require('console');
var https = require('https');

exports.DaSCH = function () {
    let pageLength = 25;


    // generic parser for both post and get
    this.parseHttpResponse = function (res, response_body, callback) {
        res.setEncoding('utf8');
        // concatenate the chunks, only the full response is a valid json that can be parsed 
        res.on('data', chunk => response_body += chunk);
        // parse the json and send it to call back
        res.on(
            'end',
            // () => callback(JSON.parse(response_body))
            // add a wrapper because all responses are not json
            () => {
                try {
                    return callback(
                        (() => { 
                            try {
                               return JSON.parse(response_body);
                            } catch (error) {
                                // fail(error);
                                console.log("unparseable : `", response_body, "`, error: ", error);
                                return callback({});
                            }
                        })()            
                    );
                } catch (error) {
                    // fail(error);
                    console.log("callback error: ", error);
                    throw(error);
                }
            }
        );
    }

    this.search = function (request, callback, fail) {
        var response_body = "";

        var post_options = {
            method: 'POST',
            host: "api.dasch.swiss",
            path: '/v2/searchextended',
            headers: {
                "content-type": "application/json"
            }
        };

        var post_req = https.request(
            post_options,
            (res) => this.parseHttpResponse(res, response_body, callback)
        );

        // make the call
        post_req.write(request);
        post_req.end();
        post_req.on('error', (e) => {
            console.error(e);
            fail(error);
        });
    }

    // make a resource call to the DaSCH api
    this.getResource = function (resourceId, callback, fail) {
        var response_body = "";

        console.log("getResource: ", resourceId);

        var get_options = {
            method: 'GET',
            host: "api.dasch.swiss",
            path: '/v2/resources/' + encodeURIComponent(resourceId),
            headers: {
                "content-type": "application/json"
            }
        };

        const get_req = https.get(
            get_options,
            (res) => this.parseHttpResponse(res, response_body, callback, fail)
        );
        get_req.on('error', (e) => {
            console.error(e);
            fail(error);
        });
    }

    // parse DaSCH list node
    // (a bit rough for now => returns french label, to be refined if needed)
    this.getListParser = function (callback) {
        // return a callback method
        return (dasch_node_json) => {
            let labels = dasch_node_json["node"]["nodeinfo"]["labels"];
            // pop first one as default
            let label = labels.pop();
            // select french ones
            let french_labels = labels.filter((element) => element["language"] == "fr");
            if (french_labels.length >0) {
                // take first one
                label = french_labels.pop();
            }
            // return match or default one
            return callback(label["value"]);
        };
    };

    // get list node
    this.getListNode = function(iri, callback, fail) {
        var response_body = "";

        var get_options = {
            method: 'GET',
            host: "api.dasch.swiss",
            path: '/admin/lists/' + encodeURIComponent(iri),
            headers: {
                "content-type": "application/json"
            }
        };

        const get_req = https.get(
            get_options,
            (res) => this.parseHttpResponse(res, response_body, this.getListParser(callback), fail)
        );
        get_req.on('error', (e) => {
            console.error(e);
            fail(error);
        });        
    }

};

exports.DaSCH.getLinkTargetId = function (data, property) {
    if (data.hasOwnProperty(property)) {
        try {
            return exports.DaSCH.arrayfy(data[property]).map(link => link["knora-api:linkValueHasTarget"]["@id"]);
        } catch(error) {
            log("unexpected error: ", error);
            throw(error);
        }
    } else {
        throw new Error(`no property ${property}`);
    }
};

exports.DaSCH.getListNodeId = function (data, property) {
    if (data.hasOwnProperty(property)) {
        return exports.DaSCH.arrayfy(data[property]).map(node => node["knora-api:listValueAsListNode"]["@id"]);
    } else {
        throw new Error(`no property ${property}`);
    }
};

exports.DaSCH.parseDate = function(startEnd, pdate) {
    const vse = (startEnd ? "Start" : "End");
    var res = "";
    let year = month = day = undefined;
    if (pdate.hasOwnProperty("knora-api:dateValueHas" + vse + "Year")) {
        year = pdate["knora-api:dateValueHas" + vse + "Year"];
    } else {
        return undefined;
    }
    if (pdate.hasOwnProperty("knora-api:dateValueHas" + vse + "Month")) {
        month = pdate["knora-api:dateValueHas" + vse + "Month"];
    } else {
        return (startEnd? year + "-01-01" : year + "-12-31");
    }
    if (pdate.hasOwnProperty("knora-api:dateValueHas" + vse + "Day")) {
        day = pdate["knora-api:dateValueHas" + vse + "Day"];
        return year +"-" + month.toString().padStart(2, "0") + "-" + day.toString().padStart(2, "0")
    } else {
        if (startEnd) {
            return year +"-"+ month.toString().padStart(2, "0") + "-01"; 
        } else {
            // month is indexed (jan = 0) so we are month+1
            // day is not, 0 => last of the previous month
            let d = new Date(Date.UTC(year, month, 0));
            return (
                new Intl.DateTimeFormat('fr', { year: 'numeric', month: '2-digit', day: '2-digit' })
            ).format(d).split("/").reverse().join('-');
        }
    }
    return undefined;
}

exports.DaSCH.getDate = function (data, property) {
    if (data.hasOwnProperty(property)) {
        const pdates = exports.DaSCH.arrayfy(data[property]);
        return pdates.map(
            (pdate) => {
                return { "start": exports.DaSCH.parseDate(true, pdate), "end": exports.DaSCH.parseDate(false, pdate) };                
            }
        )
    } else {
        throw new Error(`no property ${property}`);
    }
};

exports.DaSCH.arrayfy = function (data) {
    if (data && !(data instanceof Array)) {
        return [data];
    } else {
        return data;
    }
};

exports.DaSCH.nameAuthorities = function(authorities) {
    return authorities.map(
        (i) => {
            if (i.match(/bnf/)) { return {"cat_bnf": i}; }
            if (i.match(/isni/)) { return {"isni": i}; }
            if (i.match(/cerl/)) { return {"cerl": i}; }
            if (i.match(/bcul/)) { return {"bcul": i}; }
            if (i.match(/hls/)) { return {"hls": i}; }
            if (i.match(/viaf/)) { return {"viaf": i}; }
            if (i.match(/wikidata/)) { return {"wikidata": i}; }
            if (i.match(/bibale/)) { return {"bibale": i}; }
            if (i.match(/bge/)) { return {"bge-geneve": i}; }
            if (i.match(/ustc/)) { return {"ustc": i}; }
            if (i.match(/irht/)) { return {"irht": i}; }
            if (i.match(/biblissima/)) { return {"biblissima": i}; }
            if (i.match(/e-rara/)) { return {"e-rara": i}; }
            return {"other": i};
        }
    );
}

exports.DaSCH.concatStringValues = function(data, property, seperator) {
    // get the array of string values
    return exports.DaSCH.arrayfy(data[property]).reduce(
            (all, current) => 
            (all? all + seperator : "") + current["knora-api:valueAsString"], // agregate values
             "" // needed as first value is a StringValue and not a string
        ); 
}

exports.DaSCH.values = function(data, property) {
    // get the array of values
    return exports.DaSCH.arrayfy(data[property]).map(
            (element) => {
                const type = element["@type"]; // like "knora-api:UriValue" => "knora-api:uriValueAsUri"
                // special case:
                if (type == "knora-api:TextValue") {
                    return data[property]["knora-api:valueAsString"];
                }

                const [prefix, prop] = type.split(':'); // => [knora-api, UriValue]
                const valueBase = prop.substr(0, prop.indexOf("Value")); // => Uri
                const leaf = prefix+':'+valueBase[0].toLowerCase()+valueBase.slice(1)+"ValueAs"+valueBase; // => knora-api:uriValueAsUri
                return element[leaf]["@value"];
            }
        ); 
}

exports.DaSCH.ark = function(data) {
    return data["knora-api:arkUrl"]["@value"];
}

exports.DaSCH.id = function(data) {
    return data["@id"];
}
