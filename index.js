var strava = require('strava-v3');
var moment = require('moment');
var program = require('commander');
var fs = require('fs');

program
    .version('0.0.0')
    .option('-s --startDate <startDate>', 'the starting date')
    .option('-e --endDate <endDate>', 'the ending date')
    .option('-a --activity <activity>', 'the activity name to use for the period')
    .option('-i --ignoreWeekEnd', 'to ignore week ends in a period of time')
    .option('-S --simulate', 'to simulate execution')
    .parse(process.argv);

// We display help if no parameter provided
if (process.argv.length < 3) program.help();

program.startDate = checkDate(program.startDate, 'The starting date is not valid (shall be YYYMMDD)');
program.endDate = checkDate(program.endDate, 'The ending date is not valid (shall be YYYMMDD)');

program.endDate.hours(23).minutes(59);

if (program.activity === undefined) throw Error('The activity name is mandatory');
if (program.simulate) console.log('Simulating exchanges with strava, no data will be added or deleted');

var conf = loadConfiguration();
// We browse all available templates
Object.keys(conf.templates).forEach(function (key) {
   if (key == program.activity) {
       console.log('we will create activity!');
       while (program.startDate.isBefore(program.endDate)) {
           if (program.ignoreWeekEnd && program.startDate.day() == 6 || program.startDate.day() == 0) {
               console.log('Ignoring week end day');
           }
           // We browse all values for a given template of workout
           else {
               conf.templates[key].forEach(function (activity, key) {
                   // Getting hour and minute of the activity. We add a fake date to parse if easily.
                   var time = moment('2016-10-28 ' + activity.date_time);
                   var dateTime = moment(program.startDate).hours(time.hours()).minutes(time.minutes());
                   console.log('Adding activity %j for date %j', program.activity, dateTime.format());
                   //console.log(JSON.stringify(activity));
                   activity.start_date_local = dateTime.format();
                   if (!program.simulate) {
                       createActivity(activity);
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
    // Generates the url to have full access
    var url = strava.oauth.getRequestAccessURL({
      scope:"view_private,write"
    });
    // We have to grab the code manually in the browser and then copy/paste it into strava_config as "access_token"
    console.log('url is ' + url);
    // Code to paste
    var code = "";
    strava.oauth.getToken(code,function(err, token) {
        console.log(token);
    });
}


/**
 * TODO later, check if the activity already exists...
 */
function browseActivities() {

    var startDate = moment().add(-50, 'days');
    var endDate = moment().add(-10, 'days');

    console.log (typeof startDate.valueOf());
    console.log (startDate.valueOf());

    strava.athlete.listActivities({after: startDate.unix(), before: endDate.unix() }, function(error, activities) {
        if (error) console.log('error is ' + error);//throw Error(error);
        //console.log(JSON.stringify(activities));

        //if (activities.keys().length > 0)
        Object.keys(activities).forEach(function(key) {
            console.log(activities[key]);
        });
    });
}

/**
 * Creates a new activity using strava api.
 * @param activity the activity as expected by the strava api.
 */
function createActivity(activity) {
    strava.activities.create(
        activity,
        function (error, success) {
            if (error) throw error;
            console.log(success);
        }
    );
}

