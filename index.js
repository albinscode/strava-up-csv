var strava = require('strava-v3');
var moment = require('moment');
var program = require('commander');
var fs = require('fs');

const stravaConfig = './data/strava_config';
const stravaConfigTemplate = 'node_modules/strava-v3/strava_config';

program
    .version('0.0.0')
    .option('-g --generate', 'to generate the authentication token for strava')
    .option('-l --listTemplates', 'the list of available templates')
    .option('-L --listActivities', 'the list of activities')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .option('-a --activity <activity>', 'the activity name to use for the period')
    .option('-i --ignoreWeekEnd', 'to ignore week ends in a period of time')
    .option('-E --except <except>', 'to ignore specific day')
    .option('-S --simulate', 'to simulate execution')
    .parse(process.argv);

if (program.generate) {
    generateNewToken(); return;
}

// We display help if no argument provided
// We have at least 2 arguments 'node' and 'index.js' the current script.
if (process.argv.length < 3) program.help();

console.log(JSON.stringify(program));

// We load the json conf file
var conf = loadConfiguration();

// Listing templates from json conf file
if (program.listTemplates) {
    console.log('Displaying available activity templates');

    // We browse all available templates
    Object.keys(conf.templates).forEach(function (key) {
        console.log('- %s', key);
    });
    process.exit();
}

program.startDate = checkDate(program.startDate, 'The starting date is not valid (shall be YYYMMDD)');
program.endDate = checkDate(program.endDate, 'The ending date is not valid (shall be YYYMMDD)');

program.endDate.hours(23).minutes(59);

// we want to list activities between two dates
if (program.listActivities) {
    browseActivities();
    console.log("end of function call");
    return;
    // process.exit();
}

if (program.activity === undefined) throw Error('The activity name is mandatory');
if (program.simulate) console.log('Simulating exchanges with strava, no data will be added or deleted');

// We browse all available templates
Object.keys(conf.templates).forEach(function (key) {
   if (key == program.activity) {
       while (program.startDate.isBefore(program.endDate)) {
           if (program.ignoreWeekEnd && program.startDate.day() == 6 || program.startDate.day() === 0) {
               console.log('Ignoring week end day');
           }
           // We browse all values for a given template of workout
           else {
               conf.templates[key].forEach(function (activity, key) {
                   var ifIgnore = program.except !== undefined && moment(program.except).isValid() && program.startDate.isSame(program.except, 'days');
                   if (!ifIgnore) {
                       // Getting hour and minute of the activity. We add a fake date to parse if easily.
                       var time = moment('2016-10-28 ' + activity.date_time);
                       var dateTime = moment(program.startDate).hours(time.hours()).minutes(time.minutes());
                       console.log('Adding activity %j for date %j', program.activity, dateTime.format());
                       //console.log(JSON.stringify(activity));
                       activity.start_date_local = dateTime.format();
                       if (!program.simulate) {
                           createActivity(activity);
                       }
                   } else {
                       console.log('Ignoring day %j', program.except);
                   }
               });
           }
           program.startDate.add(1, 'days');
       }
   }
});

/**
 * @return the configuration file as javascript object.
 */
function loadConfiguration() {
    try {
        return JSON.parse(fs.readFileSync('conf/configuration.json', 'utf-8'));
    } catch (e) {
        throw Error('Configuration file not set properly');
    }
}

/**
 * @param date the string defining the date (@see Moment date format)
 * @param errorMessage the error message to display if this is not a valid date
 */
function checkDate(date, errorMessage) {
    // This will create a Moment to "today"
    if (date === undefined) date = {};
    if (!moment(date).isValid()) throw Error(errorMessage);
    return moment(date);
}


/**
 * Just for debugging purpose.
 */
function getAthleteInfos() {
    strava.athlete.get({},function(err,payload) {
        if(!err) {
            console.log(payload);
        }
        else {
            console.log(err);
        }
    });
}

/**
 * TODO make a small improvment by using inquirer to request for the code fetch
 * and then update the strava_config.
 */
function generateNewToken() {

    console.log('Before processing, you shall fill your strava config with client id and secret provided by Strava:\n https://www.strava.com/settings/api#_=_ ');

    var inquirer = require('inquirer');

    inquirer
        .prompt(
            [
                {
                    type: 'input',
                    name: 'clientId',
                    message: 'What is your strava client id?'
                },
                {
                    type: 'input',
                    name: 'clientSecret',
                    message: 'What is your strava client secret?'
                }
            ])
        .then(function (answers) {

            console.log('the value entered is ' + answers.clientId);
            // We copy the strava config file
            try {
                fs.mkdirSync('data');
            } catch (e) {
                // nothing
            }

            var content = fs.readFileSync(stravaConfigTemplate);
            fs.writeFileSync(stravaConfig, content);

            // We open the default config file and inject the client_id
            var content = fs.readFileSync(stravaConfig);
            var config = JSON.parse(content);
            config.client_id = answers.clientId;
            config.client_secret = answers.clientSecret;
            config.access_token = 'to define';
            config.redirect_uri = 'http://localhost';

            // We update the config file
            fs.writeFileSync(stravaConfig, JSON.stringify(config));

            // Generates the url to have full access
            var url = strava.oauth.getRequestAccessURL({
              scope:"view_private,write"
            });
            // We have to grab the code manually in the browser and then copy/paste it into strava_config as "access_token"
            console.log('Connect to the following url and copy the code: ' + url);

            inquirer.prompt(
                [
                    {
                        type: 'input',
                        name: 'code',
                        message: 'Enter the code obtained from previous strava url'
                    }
                ])
            .then(function (answers2) {
                strava.oauth.getToken(answers2.code, function(err, result) {
                    // We update the access token in strava conf file
                    if (result.access_token === undefined) throw 'Problem with provided code: ' + JSON.stringify(result);
                    config.access_token = result.access_token;
                    fs.writeFileSync(stravaConfig, JSON.stringify(config));
                });
            });
        });

}


/**
 * TODO later, check if the activity already exists...
 */
function browseActivities() {

    var startDate = moment().add(-50, 'days');
    var endDate = moment().add(-10, 'days');

    // console.log (typeof startDate.valueOf());
    // console.log (startDate.valueOf());

    strava.athlete.listActivities({after: startDate.unix(), before: endDate.unix() }, function(error, activities) {
        console.log('Listing activies');
        console.log(activities);
        if (error) console.log('error is ' + error);//throw Error(error);
        //console.log(JSON.stringify(activities));

        //if (activities.keys().length > 0)
        Object.keys(activities).forEach(function(key) {
            console.log(activities[key]);
        });
    });
    console.log("end of browse activities");
}

/**
 * Creates a new activity using strava api.
 * @param activity the activity as expected by the strava api.
 */
function createActivity(activity) {
    strava.activities.create(
        activity,
        function (error, success) {
            if (error) {
                console.log(JSON.stringify(error));
                throw error;
            }
            console.log(success);
        }
    );
}

