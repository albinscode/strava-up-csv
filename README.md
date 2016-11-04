A strava CLI small program
==========================

It was really boring losing time to turn on my GPS.
And boring to enter manually each recurrent workout.
This is because my workouts are mainly commuting workouts so no challenge :)

Use case examples
---

Now I can provide my whole week with one single command.

    node index.js -a "trajet bl" -s 20161024 -e 20161027

Or for one single day when I'm going back to my company:

    node index.js -a "trajet agence" -s 20161024 -e 20161024

You can list available activity templates with:

    node index.js -l

You can specify several weeks on working days by ignoring week ends:

    node index.js -s 20161107 -e 20161130 -a "trajet bl" -i

No hard work here but no more losing time on strava web site :)

Configuration
--

@See `conf/configuration.json` to configure properly your recurrent workouts.

Basic help
---

By typing `node index.js --help`:


	  Usage: index [options]

	  Options:

		-h, --help                  output usage information
		-V, --version               output the version number
		-l --listTemplates          the list of available templates
		-s --startDate <startDate>  the starting date
		-e --endDate <endDate>      the ending date
		-a --activity <activity>    the activity name to use for the period
		-i --ignoreWeekEnd          to ignore week ends in a period of time
		-S --simulate               to simulate execution

