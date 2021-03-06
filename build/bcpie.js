//! moment.js
//! version : 2.9.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {
    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = '2.9.0',
        // the global-scope this is NOT the global object in Node.js
        globalScope = (typeof global !== 'undefined' && (typeof window === 'undefined' || window === global.window)) ? global : this,
        oldGlobalMoment,
        round = Math.round,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for locale config files
        locales = {},

        // extra moment internal properties (plugins register props here)
        momentProperties = [],

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|x|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenOffsetMs = /[\+\-]?\d+/, // 1234567890123
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker '+10:00' > ['10', '00'] or '-1530' > ['-', '15', '30']
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // default relative time thresholds
        relativeTimeThresholds = {
            s: 45,  // seconds to minute
            m: 45,  // minutes to hour
            h: 22,  // hours to day
            d: 26,  // days to month
            M: 11   // months to year
        },

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.localeData().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.localeData().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.localeData().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.localeData().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.localeData().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.localeData().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ':' + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = this.utcOffset(),
                    b = '+';
                if (a < 0) {
                    a = -a;
                    b = '-';
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            x    : function () {
                return this.valueOf();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        deprecations = {},

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'],

        updateInProgress = false;

    // Pick the first defined of two or three arguments. dfl comes from
    // default.
    function dfl(a, b, c) {
        switch (arguments.length) {
            case 2: return a != null ? a : b;
            case 3: return a != null ? a : b != null ? b : c;
            default: throw new Error('Implement me');
        }
    }

    function hasOwnProp(a, b) {
        return hasOwnProperty.call(a, b);
    }

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function printMsg(msg) {
        if (moment.suppressDeprecationWarnings === false &&
                typeof console !== 'undefined' && console.warn) {
            console.warn('Deprecation warning: ' + msg);
        }
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        return extend(function () {
            if (firstTime) {
                printMsg(msg);
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function deprecateSimple(name, msg) {
        if (!deprecations[name]) {
            printMsg(msg);
            deprecations[name] = true;
        }
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.localeData().ordinal(func.call(this, a), period);
        };
    }

    function monthDiff(a, b) {
        // difference in months
        var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
            // b is in (anchor - 1 month, anchor + 1 month)
            anchor = a.clone().add(wholeMonthDiff, 'months'),
            anchor2, adjust;

        if (b - anchor < 0) {
            anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor - anchor2);
        } else {
            anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
            // linear across the month
            adjust = (b - anchor) / (anchor2 - anchor);
        }

        return -(wholeMonthDiff + adjust);
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    function meridiemFixWrap(locale, hour, meridiem) {
        var isPm;

        if (meridiem == null) {
            // nothing to do
            return hour;
        }
        if (locale.meridiemHour != null) {
            return locale.meridiemHour(hour, meridiem);
        } else if (locale.isPM != null) {
            // Fallback
            isPm = locale.isPM(meridiem);
            if (isPm && hour < 12) {
                hour += 12;
            }
            if (!isPm && hour === 12) {
                hour = 0;
            }
            return hour;
        } else {
            // thie is not supposed to happen
            return hour;
        }
    }

    /************************************
        Constructors
    ************************************/

    function Locale() {
    }

    // Moment prototype object
    function Moment(config, skipOverflow) {
        if (skipOverflow !== false) {
            checkOverflow(config);
        }
        copyConfig(this, config);
        this._d = new Date(+config._d);
        // Prevent infinite loop in case updateOffset creates new moment
        // objects.
        if (updateInProgress === false) {
            updateInProgress = true;
            moment.updateOffset(this);
            updateInProgress = false;
        }
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._locale = moment.localeData();

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (hasOwnProp(b, i)) {
                a[i] = b[i];
            }
        }

        if (hasOwnProp(b, 'toString')) {
            a.toString = b.toString;
        }

        if (hasOwnProp(b, 'valueOf')) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function copyConfig(to, from) {
        var i, prop, val;

        if (typeof from._isAMomentObject !== 'undefined') {
            to._isAMomentObject = from._isAMomentObject;
        }
        if (typeof from._i !== 'undefined') {
            to._i = from._i;
        }
        if (typeof from._f !== 'undefined') {
            to._f = from._f;
        }
        if (typeof from._l !== 'undefined') {
            to._l = from._l;
        }
        if (typeof from._strict !== 'undefined') {
            to._strict = from._strict;
        }
        if (typeof from._tzm !== 'undefined') {
            to._tzm = from._tzm;
        }
        if (typeof from._isUTC !== 'undefined') {
            to._isUTC = from._isUTC;
        }
        if (typeof from._offset !== 'undefined') {
            to._offset = from._offset;
        }
        if (typeof from._pf !== 'undefined') {
            to._pf = from._pf;
        }
        if (typeof from._locale !== 'undefined') {
            to._locale = from._locale;
        }

        if (momentProperties.length > 0) {
            for (i in momentProperties) {
                prop = momentProperties[i];
                val = from[prop];
                if (typeof val !== 'undefined') {
                    to[prop] = val;
                }
            }
        }

        return to;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        other = makeAs(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
        return function (val, period) {
            var dur, tmp;
            //invert the arguments, but complain about it
            if (period !== null && !isNaN(+period)) {
                deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period).');
                tmp = val; val = period; period = tmp;
            }

            val = typeof val === 'string' ? +val : val;
            dur = moment.duration(val, period);
            addOrSubtractDurationFromMoment(this, dur, direction);
            return this;
        };
    }

    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return Object.prototype.toString.call(input) === '[object Date]' ||
            input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (hasOwnProp(inputObject, prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment._locale[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment._locale, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 24 ||
                    (m._a[HOUR] === 24 && (m._a[MINUTE] !== 0 ||
                                           m._a[SECOND] !== 0 ||
                                           m._a[MILLISECOND] !== 0)) ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0 &&
                    m._pf.bigHour === undefined;
            }
        }
        return m._isValid;
    }

    function normalizeLocale(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
        var i = 0, j, next, locale, split;

        while (i < names.length) {
            split = normalizeLocale(names[i]).split('-');
            j = split.length;
            next = normalizeLocale(names[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                locale = loadLocale(split.slice(0, j).join('-'));
                if (locale) {
                    return locale;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return null;
    }

    function loadLocale(name) {
        var oldLocale = null;
        if (!locales[name] && hasModule) {
            try {
                oldLocale = moment.locale();
                require('./locale/' + name);
                // because defineLocale currently also sets the global locale, we want to undo that for lazy loaded locales
                moment.locale(oldLocale);
            } catch (e) { }
        }
        return locales[name];
    }

    // Return a moment from input, that is local/utc/utcOffset equivalent to
    // model.
    function makeAs(input, model) {
        var res, diff;
        if (model._isUTC) {
            res = model.clone();
            diff = (moment.isMoment(input) || isDate(input) ?
                    +input : +moment(input)) - (+res);
            // Use low-level api, because this fn is low-level api.
            res._d.setTime(+res._d + diff);
            moment.updateOffset(res, false);
            return res;
        } else {
            return moment(input).local();
        }
    }

    /************************************
        Locale
    ************************************/


    extend(Locale.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
            // Lenient ordinal parsing accepts just a number in addition to
            // number + (possibly) stuff coming from _ordinalParseLenient.
            this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + /\d{1,2}/.source);
        },

        _months : 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_'),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_'),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName, format, strict) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
                this._longMonthsParse = [];
                this._shortMonthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                mom = moment.utc([2000, i]);
                if (strict && !this._longMonthsParse[i]) {
                    this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
                    this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
                }
                if (!strict && !this._monthsParse[i]) {
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
                    return i;
                } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
                    return i;
                } else if (!strict && this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_'),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_'),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_'),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LTS : 'h:mm:ss A',
            LT : 'h:mm A',
            L : 'MM/DD/YYYY',
            LL : 'MMMM D, YYYY',
            LLL : 'MMMM D, YYYY LT',
            LLLL : 'dddd, MMMM D, YYYY LT'
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },


        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom, now) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom, [now]) : output;
        },

        _relativeTime : {
            future : 'in %s',
            past : '%s ago',
            s : 'a few seconds',
            m : 'a minute',
            mm : '%d minutes',
            h : 'an hour',
            hh : '%d hours',
            d : 'a day',
            dd : '%d days',
            M : 'a month',
            MM : '%d months',
            y : 'a year',
            yy : '%d years'
        },

        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },

        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace('%d', number);
        },
        _ordinal : '%d',
        _ordinalParse : /\d{1,2}/,

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        firstDayOfWeek : function () {
            return this._week.dow;
        },

        firstDayOfYear : function () {
            return this._week.doy;
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, '');
        }
        return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = '';
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        if (!m.isValid()) {
            return m.localeData().invalidDate();
        }

        format = expandFormat(format, m.localeData());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return locale.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) {
                return parseTokenOneDigit;
            }
            /* falls through */
        case 'SS':
            if (strict) {
                return parseTokenTwoDigits;
            }
            /* falls through */
        case 'SSS':
            if (strict) {
                return parseTokenThreeDigits;
            }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return config._locale._meridiemParse;
        case 'x':
            return parseTokenOffsetMs;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return strict ? config._locale._ordinalParse : config._locale._ordinalParseLenient;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), 'i'));
            return a;
        }
    }

    function utcOffsetFromString(string) {
        string = string || '';
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? minutes : -minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = config._locale.monthsParse(input, token, config._strict);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(
                            input.match(/\d{1,2}/)[0], 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._meridiem = input;
            // config._isPm = config._locale.isPM(input);
            break;
        // HOUR
        case 'h' : // fall through to hh
        case 'hh' :
            config._pf.bigHour = true;
            /* falls through */
        case 'H' : // fall through to HH
        case 'HH' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX OFFSET (MILLISECONDS)
        case 'x':
            config._d = new Date(toInt(input));
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = utcOffsetFromString(input);
            break;
        // WEEKDAY - human
        case 'dd':
        case 'ddd':
        case 'dddd':
            a = config._locale.weekdaysParse(input);
            // if we didn't get a weekday name, mark the date as invalid
            if (a != null) {
                config._w = config._w || {};
                config._w['d'] = a;
            } else {
                config._pf.invalidWeekday = input;
            }
            break;
        // WEEK, WEEK DAY - numeric
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = toInt(input);
            }
            break;
        case 'gg':
        case 'GG':
            config._w = config._w || {};
            config._w[token] = moment.parseTwoDigitYear(input);
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
            week = dfl(w.W, 1);
            weekday = dfl(w.E, 1);
        } else {
            dow = config._locale._week.dow;
            doy = config._locale._week.doy;

            weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
            week = dfl(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // Check for 24:00:00.000
        if (config._a[HOUR] === 24 &&
                config._a[MINUTE] === 0 &&
                config._a[SECOND] === 0 &&
                config._a[MILLISECOND] === 0) {
            config._nextDay = true;
            config._a[HOUR] = 0;
        }

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
        // Apply timezone offset from input. The actual utcOffset can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
        }

        if (config._nextDay) {
            config._a[HOUR] = 24;
        }
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day || normalizedInput.date,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {
        if (config._f === moment.ISO_8601) {
            parseISO(config);
            return;
        }

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // clear _12h flag if hour is <= 12
        if (config._pf.bigHour === true && config._a[HOUR] <= 12) {
            config._pf.bigHour = undefined;
        }
        // handle meridiem
        config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR],
                config._meridiem);
        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = copyConfig({}, config);
            if (config._useUTC != null) {
                tempConfig._useUTC = config._useUTC;
            }
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function parseISO(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be 'T' or undefined
                    config._f = isoDates[i][0] + (match[6] || ' ');
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += 'Z';
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function makeDateFromString(config) {
        parseISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            moment.createFromInputFallback(config);
        }
    }

    function map(arr, fn) {
        var res = [], i;
        for (i = 0; i < arr.length; ++i) {
            res.push(fn(arr[i], i));
        }
        return res;
    }

    function makeDateFromInput(config) {
        var input = config._i, matched;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if ((matched = aspNetJsonRegex.exec(input)) !== null) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = map(input.slice(0), function (obj) {
                return parseInt(obj, 10);
            });
            dateFromConfig(config);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, locale) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = locale.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
        return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(posNegDuration, withoutSuffix, locale) {
        var duration = moment.duration(posNegDuration).abs(),
            seconds = round(duration.as('s')),
            minutes = round(duration.as('m')),
            hours = round(duration.as('h')),
            days = round(duration.as('d')),
            months = round(duration.as('M')),
            years = round(duration.as('y')),

            args = seconds < relativeTimeThresholds.s && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < relativeTimeThresholds.m && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < relativeTimeThresholds.h && ['hh', hours] ||
                days === 1 && ['d'] ||
                days < relativeTimeThresholds.d && ['dd', days] ||
                months === 1 && ['M'] ||
                months < relativeTimeThresholds.M && ['MM', months] ||
                years === 1 && ['y'] || ['yy', years];

        args[2] = withoutSuffix;
        args[3] = +posNegDuration > 0;
        args[4] = locale;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add(daysToDayOfWeek, 'd');
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f,
            res;

        config._locale = config._locale || moment.localeData(config._l);

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = config._locale.preparse(input);
        }

        if (moment.isMoment(input)) {
            return new Moment(input, true);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        res = new Moment(config);
        if (res._nextDay) {
            // Adding is smart enough around DST
            res.add(1, 'd');
            res._nextDay = undefined;
        }

        return res;
    }

    moment = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = locale;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
        'moment construction falls back to js Date. This is ' +
        'discouraged and will be removed in upcoming major ' +
        'release. Please refer to ' +
        'https://github.com/moment/moment/issues/1407 for more info.',
        function (config) {
            config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return moment();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    moment.min = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    };

    moment.max = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    };

    // creating with utc
    moment.utc = function (input, format, locale, strict) {
        var c;

        if (typeof(locale) === 'boolean') {
            strict = locale;
            locale = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = locale;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso,
            diffRes;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === '-') ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        } else if (duration == null) {// checks for null or undefined
            duration = {};
        } else if (typeof duration === 'object' &&
                ('from' in duration || 'to' in duration)) {
            diffRes = momentsDifference(moment(duration.from), moment(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && hasOwnProp(input, '_locale')) {
            ret._locale = input._locale;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // constant that refers to the ISO standard
    moment.ISO_8601 = function () {};

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function allows you to set a threshold for relative time strings
    moment.relativeTimeThreshold = function (threshold, limit) {
        if (relativeTimeThresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return relativeTimeThresholds[threshold];
        }
        relativeTimeThresholds[threshold] = limit;
        return true;
    };

    moment.lang = deprecate(
        'moment.lang is deprecated. Use moment.locale instead.',
        function (key, value) {
            return moment.locale(key, value);
        }
    );

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    moment.locale = function (key, values) {
        var data;
        if (key) {
            if (typeof(values) !== 'undefined') {
                data = moment.defineLocale(key, values);
            }
            else {
                data = moment.localeData(key);
            }

            if (data) {
                moment.duration._locale = moment._locale = data;
            }
        }

        return moment._locale._abbr;
    };

    moment.defineLocale = function (name, values) {
        if (values !== null) {
            values.abbr = name;
            if (!locales[name]) {
                locales[name] = new Locale();
            }
            locales[name].set(values);

            // backwards compat for now: also set the locale
            moment.locale(name);

            return locales[name];
        } else {
            // useful for testing
            delete locales[name];
            return null;
        }
    };

    moment.langData = deprecate(
        'moment.langData is deprecated. Use moment.localeData instead.',
        function (key) {
            return moment.localeData(key);
        }
    );

    // returns locale data
    moment.localeData = function (key) {
        var locale;

        if (key && key._locale && key._locale._abbr) {
            key = key._locale._abbr;
        }

        if (!key) {
            return moment._locale;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            locale = loadLocale(key);
            if (locale) {
                return locale;
            }
            key = [key];
        }

        return chooseLocale(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null && hasOwnProp(obj, '_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    moment.isDate = isDate;

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d - ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                if ('function' === typeof Date.prototype.toISOString) {
                    // native implementation is ~50x faster, use it when we can
                    return this.toDate().toISOString();
                } else {
                    return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
                }
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {
            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function (keepLocalTime) {
            return this.utcOffset(0, keepLocalTime);
        },

        local : function (keepLocalTime) {
            if (this._isUTC) {
                this.utcOffset(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.subtract(this._dateUtcOffset(), 'm');
                }
            }
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.localeData().postformat(output);
        },

        add : createAdder(1, 'add'),

        subtract : createAdder(-1, 'subtract'),

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (that.utcOffset() - this.utcOffset()) * 6e4,
                anchor, diff, output, daysAdjust;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month' || units === 'quarter') {
                output = monthDiff(this, that);
                if (units === 'quarter') {
                    output = output / 3;
                } else if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = this - that;
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function (time) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're locat/utc/offset
            // or not.
            var now = time || moment(),
                sod = makeAs(now, this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.localeData().calendar(format, this, moment(now)));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.utcOffset() > this.clone().month(0).utcOffset() ||
                this.utcOffset() > this.clone().month(5).utcOffset());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.localeData());
                return this.add(input - day, 'd');
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf : function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            if (units === undefined || units === 'millisecond') {
                return this;
            }
            return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
        },

        isAfter: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this > +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return inputMs < +this.clone().startOf(units);
            }
        },

        isBefore: function (input, units) {
            var inputMs;
            units = normalizeUnits(typeof units !== 'undefined' ? units : 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this < +input;
            } else {
                inputMs = moment.isMoment(input) ? +input : +moment(input);
                return +this.clone().endOf(units) < inputMs;
            }
        },

        isBetween: function (from, to, units) {
            return this.isAfter(from, units) && this.isBefore(to, units);
        },

        isSame: function (input, units) {
            var inputMs;
            units = normalizeUnits(units || 'millisecond');
            if (units === 'millisecond') {
                input = moment.isMoment(input) ? input : moment(input);
                return +this === +input;
            } else {
                inputMs = +moment(input);
                return +(this.clone().startOf(units)) <= inputMs && inputMs <= +(this.clone().endOf(units));
            }
        },

        min: deprecate(
                 'moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548',
                 function (other) {
                     other = moment.apply(null, arguments);
                     return other < this ? this : other;
                 }
         ),

        max: deprecate(
                'moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548',
                function (other) {
                    other = moment.apply(null, arguments);
                    return other > this ? this : other;
                }
        ),

        zone : deprecate(
                'moment().zone is deprecated, use moment().utcOffset instead. ' +
                'https://github.com/moment/moment/issues/1779',
                function (input, keepLocalTime) {
                    if (input != null) {
                        if (typeof input !== 'string') {
                            input = -input;
                        }

                        this.utcOffset(input, keepLocalTime);

                        return this;
                    } else {
                        return -this.utcOffset();
                    }
                }
        ),

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        utcOffset : function (input, keepLocalTime) {
            var offset = this._offset || 0,
                localAdjust;
            if (input != null) {
                if (typeof input === 'string') {
                    input = utcOffsetFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = this._dateUtcOffset();
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.add(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(input - offset, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }

                return this;
            } else {
                return this._isUTC ? offset : this._dateUtcOffset();
            }
        },

        isLocal : function () {
            return !this._isUTC;
        },

        isUtcOffset : function () {
            return this._isUTC;
        },

        isUtc : function () {
            return this._isUTC && this._offset === 0;
        },

        zoneAbbr : function () {
            return this._isUTC ? 'UTC' : '';
        },

        zoneName : function () {
            return this._isUTC ? 'Coordinated Universal Time' : '';
        },

        parseZone : function () {
            if (this._tzm) {
                this.utcOffset(this._tzm);
            } else if (typeof this._i === 'string') {
                this.utcOffset(utcOffsetFromString(this._i));
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).utcOffset();
            }

            return (this.utcOffset() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.localeData()._week.dow, this.localeData()._week.doy).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add((input - year), 'y');
        },

        week : function (input) {
            var week = this.localeData().week(this);
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add((input - week) * 7, 'd');
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
            return input == null ? weekday : this.add(input - weekday, 'd');
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this.localeData()._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            var unit;
            if (typeof units === 'object') {
                for (unit in units) {
                    this.set(unit, units[unit]);
                }
            }
            else {
                units = normalizeUnits(units);
                if (typeof this[units] === 'function') {
                    this[units](value);
                }
            }
            return this;
        },

        // If passed a locale key, it will set the locale for this
        // instance.  Otherwise, it will return the locale configuration
        // variables for this instance.
        locale : function (key) {
            var newLocaleData;

            if (key === undefined) {
                return this._locale._abbr;
            } else {
                newLocaleData = moment.localeData(key);
                if (newLocaleData != null) {
                    this._locale = newLocaleData;
                }
                return this;
            }
        },

        lang : deprecate(
            'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
            function (key) {
                if (key === undefined) {
                    return this.localeData();
                } else {
                    return this.locale(key);
                }
            }
        ),

        localeData : function () {
            return this._locale;
        },

        _dateUtcOffset : function () {
            // On Firefox.24 Date#getTimezoneOffset returns a floating point.
            // https://github.com/moment/moment/pull/1871
            return -Math.round(this._d.getTimezoneOffset() / 15) * 15;
        }

    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.localeData().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate('dates accessor is deprecated. Use date instead.', makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate('years accessor is deprecated. Use year instead.', makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    // alias isUtc for dev-friendliness
    moment.fn.isUTC = moment.fn.isUtc;

    /************************************
        Duration Prototype
    ************************************/


    function daysToYears (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        return days * 400 / 146097;
    }

    function yearsToDays (years) {
        // years * 365 + absRound(years / 4) -
        //     absRound(years / 100) + absRound(years / 400);
        return years * 146097 / 400;
    }

    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years = 0;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);

            // Accurately convert days to years, assume start from year 0.
            years = absRound(daysToYears(days));
            days -= absRound(yearsToDays(years));

            // 30 days to a month
            // TODO (iskren): Use anchor date (like 1st Jan) to compute this.
            months += absRound(days / 30);
            days %= 30;

            // 12 months -> 1 year
            years += absRound(months / 12);
            months %= 12;

            data.days = days;
            data.months = months;
            data.years = years;
        },

        abs : function () {
            this._milliseconds = Math.abs(this._milliseconds);
            this._days = Math.abs(this._days);
            this._months = Math.abs(this._months);

            this._data.milliseconds = Math.abs(this._data.milliseconds);
            this._data.seconds = Math.abs(this._data.seconds);
            this._data.minutes = Math.abs(this._data.minutes);
            this._data.hours = Math.abs(this._data.hours);
            this._data.months = Math.abs(this._data.months);
            this._data.years = Math.abs(this._data.years);

            return this;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var output = relativeTime(this, !withSuffix, this.localeData());

            if (withSuffix) {
                output = this.localeData().pastFuture(+this, output);
            }

            return this.localeData().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            var days, months;
            units = normalizeUnits(units);

            if (units === 'month' || units === 'year') {
                days = this._days + this._milliseconds / 864e5;
                months = this._months + daysToYears(days) * 12;
                return units === 'month' ? months : months / 12;
            } else {
                // handle milliseconds separately because of floating point math errors (issue #1867)
                days = this._days + Math.round(yearsToDays(this._months / 12));
                switch (units) {
                    case 'week': return days / 7 + this._milliseconds / 6048e5;
                    case 'day': return days + this._milliseconds / 864e5;
                    case 'hour': return days * 24 + this._milliseconds / 36e5;
                    case 'minute': return days * 24 * 60 + this._milliseconds / 6e4;
                    case 'second': return days * 24 * 60 * 60 + this._milliseconds / 1000;
                    // Math.floor prevents floating point math errors here
                    case 'millisecond': return Math.floor(days * 24 * 60 * 60 * 1000) + this._milliseconds;
                    default: throw new Error('Unknown unit ' + units);
                }
            }
        },

        lang : moment.fn.lang,
        locale : moment.fn.locale,

        toIsoString : deprecate(
            'toIsoString() is deprecated. Please use toISOString() instead ' +
            '(notice the capitals)',
            function () {
                return this.toISOString();
            }
        ),

        toISOString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        },

        localeData : function () {
            return this._locale;
        },

        toJSON : function () {
            return this.toISOString();
        }
    });

    moment.duration.fn.toString = moment.duration.fn.toISOString;

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    for (i in unitMillisecondFactors) {
        if (hasOwnProp(unitMillisecondFactors, i)) {
            makeDurationGetter(i.toLowerCase());
        }
    }

    moment.duration.fn.asMilliseconds = function () {
        return this.as('ms');
    };
    moment.duration.fn.asSeconds = function () {
        return this.as('s');
    };
    moment.duration.fn.asMinutes = function () {
        return this.as('m');
    };
    moment.duration.fn.asHours = function () {
        return this.as('h');
    };
    moment.duration.fn.asDays = function () {
        return this.as('d');
    };
    moment.duration.fn.asWeeks = function () {
        return this.as('weeks');
    };
    moment.duration.fn.asMonths = function () {
        return this.as('M');
    };
    moment.duration.fn.asYears = function () {
        return this.as('y');
    };

    /************************************
        Default Locale
    ************************************/


    // Set default locale, other locale will inherit from English.
    moment.locale('en', {
        ordinalParse: /\d{1,2}(th|st|nd|rd)/,
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LOCALES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    'Accessing Moment through the global scope is ' +
                    'deprecated, and will be removed in an upcoming ' +
                    'release.',
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === 'function' && define.amd) {
        define(function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);

//! moment-timezone.js
//! version : 0.3.0
//! author : Tim Wood
//! license : MIT
//! github.com/moment/moment-timezone

(function (root, factory) {
	"use strict";

	/*global define*/
	if (typeof define === 'function' && define.amd) {
		define(['moment'], factory);                 // AMD
	} else if (typeof exports === 'object') {
		module.exports = factory(require('moment')); // Node
	} else {
		factory(root.moment);                        // Browser
	}
}(this, function (moment) {
	"use strict";

	// Do not load moment-timezone a second time.
	if (moment.tz !== undefined) { return moment; }

	var VERSION = "0.3.0",
		zones = {},
		links = {},

		momentVersion = moment.version.split('.'),
		major = +momentVersion[0],
		minor = +momentVersion[1];

	// Moment.js version check
	if (major < 2 || (major === 2 && minor < 6)) {
		logError('Moment Timezone requires Moment.js >= 2.6.0. You are using Moment.js ' + moment.version + '. See momentjs.com');
	}

	/************************************
		Unpacking
	************************************/

	function charCodeToInt(charCode) {
		if (charCode > 96) {
			return charCode - 87;
		} else if (charCode > 64) {
			return charCode - 29;
		}
		return charCode - 48;
	}

	function unpackBase60(string) {
		var i = 0,
			parts = string.split('.'),
			whole = parts[0],
			fractional = parts[1] || '',
			multiplier = 1,
			num,
			out = 0,
			sign = 1;

		// handle negative numbers
		if (string.charCodeAt(0) === 45) {
			i = 1;
			sign = -1;
		}

		// handle digits before the decimal
		for (i; i < whole.length; i++) {
			num = charCodeToInt(whole.charCodeAt(i));
			out = 60 * out + num;
		}

		// handle digits after the decimal
		for (i = 0; i < fractional.length; i++) {
			multiplier = multiplier / 60;
			num = charCodeToInt(fractional.charCodeAt(i));
			out += num * multiplier;
		}

		return out * sign;
	}

	function arrayToInt (array) {
		for (var i = 0; i < array.length; i++) {
			array[i] = unpackBase60(array[i]);
		}
	}

	function intToUntil (array, length) {
		for (var i = 0; i < length; i++) {
			array[i] = Math.round((array[i - 1] || 0) + (array[i] * 60000)); // minutes to milliseconds
		}

		array[length - 1] = Infinity;
	}

	function mapIndices (source, indices) {
		var out = [], i;

		for (i = 0; i < indices.length; i++) {
			out[i] = source[indices[i]];
		}

		return out;
	}

	function unpack (string) {
		var data = string.split('|'),
			offsets = data[2].split(' '),
			indices = data[3].split(''),
			untils  = data[4].split(' ');

		arrayToInt(offsets);
		arrayToInt(indices);
		arrayToInt(untils);

		intToUntil(untils, indices.length);

		return {
			name    : data[0],
			abbrs   : mapIndices(data[1].split(' '), indices),
			offsets : mapIndices(offsets, indices),
			untils  : untils
		};
	}

	/************************************
		Zone object
	************************************/

	function Zone (packedString) {
		if (packedString) {
			this._set(unpack(packedString));
		}
	}

	Zone.prototype = {
		_set : function (unpacked) {
			this.name    = unpacked.name;
			this.abbrs   = unpacked.abbrs;
			this.untils  = unpacked.untils;
			this.offsets = unpacked.offsets;
		},

		_index : function (timestamp) {
			var target = +timestamp,
				untils = this.untils,
				i;

			for (i = 0; i < untils.length; i++) {
				if (target < untils[i]) {
					return i;
				}
			}
		},

		parse : function (timestamp) {
			var target  = +timestamp,
				offsets = this.offsets,
				untils  = this.untils,
				max     = untils.length - 1,
				offset, offsetNext, offsetPrev, i;

			for (i = 0; i < max; i++) {
				offset     = offsets[i];
				offsetNext = offsets[i + 1];
				offsetPrev = offsets[i ? i - 1 : i];

				if (offset < offsetNext && tz.moveAmbiguousForward) {
					offset = offsetNext;
				} else if (offset > offsetPrev && tz.moveInvalidForward) {
					offset = offsetPrev;
				}

				if (target < untils[i] - (offset * 60000)) {
					return offsets[i];
				}
			}

			return offsets[max];
		},

		abbr : function (mom) {
			return this.abbrs[this._index(mom)];
		},

		offset : function (mom) {
			return this.offsets[this._index(mom)];
		}
	};

	/************************************
		Global Methods
	************************************/

	function normalizeName (name) {
		return (name || '').toLowerCase().replace(/\//g, '_');
	}

	function addZone (packed) {
		var i, zone, zoneName;

		if (typeof packed === "string") {
			packed = [packed];
		}

		for (i = 0; i < packed.length; i++) {
			zone = new Zone(packed[i]);
			zoneName = normalizeName(zone.name);
			zones[zoneName] = zone;
			upgradeLinksToZones(zoneName);
		}
	}

	function getZone (name) {
		return zones[normalizeName(name)] || null;
	}

	function getNames () {
		var i, out = [];

		for (i in zones) {
			if (zones.hasOwnProperty(i) && zones[i]) {
				out.push(zones[i].name);
			}
		}

		return out.sort();
	}

	function addLink (aliases) {
		var i, alias;

		if (typeof aliases === "string") {
			aliases = [aliases];
		}

		for (i = 0; i < aliases.length; i++) {
			alias = aliases[i].split('|');
			pushLink(alias[0], alias[1]);
			pushLink(alias[1], alias[0]);
		}
	}

	function upgradeLinksToZones (zoneName) {
		if (!links[zoneName]) {
			return;
		}

		var i,
			zone = zones[zoneName],
			linkNames = links[zoneName];

		for (i = 0; i < linkNames.length; i++) {
			copyZoneWithName(zone, linkNames[i]);
		}

		links[zoneName] = null;
	}

	function copyZoneWithName (zone, name) {
		var linkZone = zones[normalizeName(name)] = new Zone();
		linkZone._set(zone);
		linkZone.name = name;
	}

	function pushLink (zoneName, linkName) {
		zoneName = normalizeName(zoneName);

		if (zones[zoneName]) {
			copyZoneWithName(zones[zoneName], linkName);
		} else {
			links[zoneName] = links[zoneName] || [];
			links[zoneName].push(linkName);
		}
	}

	function loadData (data) {
		addZone(data.zones);
		addLink(data.links);
		tz.dataVersion = data.version;
	}

	function zoneExists (name) {
		if (!zoneExists.didShowError) {
			zoneExists.didShowError = true;
				logError("moment.tz.zoneExists('" + name + "') has been deprecated in favor of !moment.tz.zone('" + name + "')");
		}
		return !!getZone(name);
	}

	function needsOffset (m) {
		return !!(m._a && (m._tzm === undefined));
	}

	function logError (message) {
		if (typeof console !== 'undefined' && typeof console.error === 'function') {
			console.error(message);
		}
	}

	/************************************
		moment.tz namespace
	************************************/

	function tz (input) {
		var args = Array.prototype.slice.call(arguments, 0, -1),
			name = arguments[arguments.length - 1],
			zone = getZone(name),
			out  = moment.utc.apply(null, args);

		if (zone && !moment.isMoment(input) && needsOffset(out)) {
			out.add(zone.parse(out), 'minutes');
		}

		out.tz(name);

		return out;
	}

	tz.version      = VERSION;
	tz.dataVersion  = '';
	tz._zones       = zones;
	tz._links       = links;
	tz.add          = addZone;
	tz.link         = addLink;
	tz.load         = loadData;
	tz.zone         = getZone;
	tz.zoneExists   = zoneExists; // deprecated in 0.1.0
	tz.names        = getNames;
	tz.Zone         = Zone;
	tz.unpack       = unpack;
	tz.unpackBase60 = unpackBase60;
	tz.needsOffset  = needsOffset;
	tz.moveInvalidForward   = true;
	tz.moveAmbiguousForward = false;

	/************************************
		Interface with Moment.js
	************************************/

	var fn = moment.fn;

	moment.tz = tz;

	moment.defaultZone = null;

	moment.updateOffset = function (mom, keepTime) {
		var offset;
		if (mom._z === undefined) {
			mom._z = moment.defaultZone;
		}
		if (mom._z) {
			offset = mom._z.offset(mom);
			if (Math.abs(offset) < 16) {
				offset = offset / 60;
			}
			if (mom.utcOffset !== undefined) {
				mom.utcOffset(-offset, keepTime);
			} else {
				mom.zone(offset, keepTime);
			}
		}
	};

	fn.tz = function (name) {
		if (name) {
			this._z = getZone(name);
			if (this._z) {
				moment.updateOffset(this);
			} else {
				logError("Moment Timezone has no data for " + name + ". See http://momentjs.com/timezone/docs/#/data-loading/.");
			}
			return this;
		}
		if (this._z) { return this._z.name; }
	};

	function abbrWrap (old) {
		return function () {
			if (this._z) { return this._z.abbr(this); }
			return old.call(this);
		};
	}

	function resetZoneWrap (old) {
		return function () {
			this._z = null;
			return old.apply(this, arguments);
		};
	}

	fn.zoneName = abbrWrap(fn.zoneName);
	fn.zoneAbbr = abbrWrap(fn.zoneAbbr);
	fn.utc      = resetZoneWrap(fn.utc);

	moment.tz.setDefault = function(name) {
		if (major < 2 || (major === 2 && minor < 9)) {
			logError('Moment Timezone setDefault() requires Moment.js >= 2.9.0. You are using Moment.js ' + moment.version + '.');
		}
		moment.defaultZone = name ? getZone(name) : null;
		return moment;
	};

	// Cloning a moment should include the _z property.
	var momentProperties = moment.momentProperties;
	if (Object.prototype.toString.call(momentProperties) === '[object Array]') {
		// moment 2.8.1+
		momentProperties.push('_z');
		momentProperties.push('_a');
	} else if (momentProperties) {
		// moment 2.7.0
		momentProperties._z = null;
	}

	loadData({
		"version": "2014j",
		"zones": [
			"Africa/Abidjan|GMT|0|0|",
			"Africa/Addis_Ababa|EAT|-30|0|",
			"Africa/Algiers|CET|-10|0|",
			"Africa/Bangui|WAT|-10|0|",
			"Africa/Blantyre|CAT|-20|0|",
			"Africa/Cairo|EET EEST|-20 -30|0101010101010101010101010101010|1Cby0 Fb0 c10 8n0 8Nd0 gL0 e10 mn0 1o10 jz0 gN0 pb0 1qN0 dX0 e10 xz0 1o10 bb0 e10 An0 1o10 5z0 e10 FX0 1o10 2L0 e10 IL0 1C10 Lz0",
			"Africa/Casablanca|WET WEST|0 -10|01010101010101010101010101010101010101010|1Cco0 Db0 1zd0 Lz0 1Nf0 wM0 co0 go0 1o00 s00 dA0 vc0 11A0 A00 e00 y00 11A0 uo0 e00 DA0 11A0 rA0 e00 Jc0 WM0 m00 gM0 M00 WM0 jc0 e00 RA0 11A0 dA0 e00 Uo0 11A0 800 gM0 Xc0",
			"Africa/Ceuta|CET CEST|-10 -20|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Africa/Johannesburg|SAST|-20|0|",
			"Africa/Tripoli|EET CET CEST|-20 -10 -20|0120|1IlA0 TA0 1o00",
			"Africa/Windhoek|WAST WAT|-20 -10|01010101010101010101010|1C1c0 11B0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 11B0",
			"America/Adak|HAST HADT|a0 90|01010101010101010101010|1BR00 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Anchorage|AKST AKDT|90 80|01010101010101010101010|1BQX0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Anguilla|AST|40|0|",
			"America/Araguaina|BRT BRST|30 20|010|1IdD0 Lz0",
			"America/Argentina/Buenos_Aires|ART|30|0|",
			"America/Asuncion|PYST PYT|30 40|01010101010101010101010|1C430 1a10 1fz0 1a10 1fz0 1cN0 17b0 1ip0 17b0 1ip0 17b0 1ip0 19X0 1fB0 19X0 1fB0 19X0 1ip0 17b0 1ip0 17b0 1ip0",
			"America/Atikokan|EST|50|0|",
			"America/Bahia|BRT BRST|30 20|010|1FJf0 Rb0",
			"America/Bahia_Banderas|MST CDT CST|70 50 60|01212121212121212121212|1C1l0 1nW0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0",
			"America/Belem|BRT|30|0|",
			"America/Belize|CST|60|0|",
			"America/Boa_Vista|AMT|40|0|",
			"America/Bogota|COT|50|0|",
			"America/Boise|MST MDT|70 60|01010101010101010101010|1BQV0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Campo_Grande|AMST AMT|30 40|01010101010101010101010|1BIr0 1zd0 On0 1zd0 Rb0 1zd0 Lz0 1C10 Lz0 1C10 On0 1zd0 On0 1zd0 On0 1zd0 On0 1C10 Lz0 1C10 Lz0 1C10",
			"America/Cancun|CST CDT|60 50|01010101010101010101010|1C1k0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0",
			"America/Caracas|VET|4u|0|",
			"America/Cayenne|GFT|30|0|",
			"America/Chicago|CST CDT|60 50|01010101010101010101010|1BQU0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Chihuahua|MST MDT|70 60|01010101010101010101010|1C1l0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0",
			"America/Creston|MST|70|0|",
			"America/Dawson|PST PDT|80 70|01010101010101010101010|1BQW0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Detroit|EST EDT|50 40|01010101010101010101010|1BQT0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Eirunepe|AMT ACT|40 50|01|1KLE0",
			"America/Glace_Bay|AST ADT|40 30|01010101010101010101010|1BQS0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Godthab|WGT WGST|30 20|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"America/Goose_Bay|AST ADT|40 30|01010101010101010101010|1BQQ1 1zb0 Op0 1zcX Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Grand_Turk|EST EDT AST|50 40 40|0101010101012|1BQT0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Guayaquil|ECT|50|0|",
			"America/Guyana|GYT|40|0|",
			"America/Havana|CST CDT|50 40|01010101010101010101010|1BQR0 1wo0 U00 1zc0 U00 1qM0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0 Rc0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0",
			"America/La_Paz|BOT|40|0|",
			"America/Lima|PET|50|0|",
			"America/Metlakatla|PST|80|0|",
			"America/Miquelon|PMST PMDT|30 20|01010101010101010101010|1BQR0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Montevideo|UYST UYT|20 30|01010101010101010101010|1BQQ0 1ld0 14n0 1ld0 14n0 1o10 11z0 1o10 11z0 1o10 11z0 1o10 14n0 1ld0 14n0 1ld0 14n0 1o10 11z0 1o10 11z0 1o10",
			"America/Noronha|FNT|20|0|",
			"America/North_Dakota/Beulah|MST MDT CST CDT|70 60 60 50|01232323232323232323232|1BQV0 1zb0 Oo0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Paramaribo|SRT|30|0|",
			"America/Port-au-Prince|EST EDT|50 40|0101010101010101010|1GI70 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"America/Santa_Isabel|PST PDT|80 70|01010101010101010101010|1C1m0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0",
			"America/Santiago|CLST CLT|30 40|01010101010101010101010|1C1f0 1fB0 1nX0 G10 1EL0 Op0 1zb0 Rd0 1wn0 Rd0 1wn0 Rd0 1wn0 Rd0 1wn0 Rd0 1zb0 Op0 1zb0 Rd0 1wn0 Rd0",
			"America/Sao_Paulo|BRST BRT|20 30|01010101010101010101010|1BIq0 1zd0 On0 1zd0 Rb0 1zd0 Lz0 1C10 Lz0 1C10 On0 1zd0 On0 1zd0 On0 1zd0 On0 1C10 Lz0 1C10 Lz0 1C10",
			"America/Scoresbysund|EGT EGST|10 0|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"America/St_Johns|NST NDT|3u 2u|01010101010101010101010|1BQPv 1zb0 Op0 1zcX Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0",
			"Antarctica/Casey|CAST AWST|-b0 -80|0101|1BN30 40P0 KL0",
			"Antarctica/Davis|DAVT DAVT|-50 -70|0101|1BPw0 3Wn0 KN0",
			"Antarctica/DumontDUrville|DDUT|-a0|0|",
			"Antarctica/Macquarie|AEDT MIST|-b0 -b0|01|1C140",
			"Antarctica/Mawson|MAWT|-50|0|",
			"Antarctica/McMurdo|NZDT NZST|-d0 -c0|01010101010101010101010|1C120 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00",
			"Antarctica/Rothera|ROTT|30|0|",
			"Antarctica/Syowa|SYOT|-30|0|",
			"Antarctica/Troll|UTC CEST|0 -20|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Antarctica/Vostok|VOST|-60|0|",
			"Asia/Aden|AST|-30|0|",
			"Asia/Almaty|ALMT|-60|0|",
			"Asia/Amman|EET EEST|-20 -30|010101010101010101010|1BVy0 1qM0 11A0 1o00 11A0 4bX0 Dd0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0",
			"Asia/Anadyr|ANAT ANAST ANAT|-c0 -c0 -b0|0120|1BWe0 1qN0 WM0",
			"Asia/Aqtau|AQTT|-50|0|",
			"Asia/Ashgabat|TMT|-50|0|",
			"Asia/Baku|AZT AZST|-40 -50|01010101010101010101010|1BWo0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Asia/Bangkok|ICT|-70|0|",
			"Asia/Beirut|EET EEST|-20 -30|01010101010101010101010|1BWm0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0",
			"Asia/Bishkek|KGT|-60|0|",
			"Asia/Brunei|BNT|-80|0|",
			"Asia/Calcutta|IST|-5u|0|",
			"Asia/Chita|YAKT YAKST YAKT IRKT|-90 -a0 -a0 -80|01023|1BWh0 1qM0 WM0 8Hz0",
			"Asia/Choibalsan|CHOT|-80|0|",
			"Asia/Chongqing|CST|-80|0|",
			"Asia/Dacca|BDT|-60|0|",
			"Asia/Damascus|EET EEST|-20 -30|01010101010101010101010|1C0m0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0",
			"Asia/Dili|TLT|-90|0|",
			"Asia/Dubai|GST|-40|0|",
			"Asia/Dushanbe|TJT|-50|0|",
			"Asia/Gaza|EET EEST|-20 -30|01010101010101010101010|1BVW1 SKX 1xd1 MKX 1AN0 1a00 1fA0 1cL0 1cN0 1cL0 1cN0 1cL0 1fB0 19X0 1fB0 19X0 1fB0 19X0 1fB0 1cL0 1cN0 1cL0",
			"Asia/Hebron|EET EEST|-20 -30|0101010101010101010101010|1BVy0 Tb0 1xd1 MKX bB0 cn0 1cN0 1a00 1fA0 1cL0 1cN0 1cL0 1cN0 1cL0 1fB0 19X0 1fB0 19X0 1fB0 19X0 1fB0 1cL0 1cN0 1cL0",
			"Asia/Hong_Kong|HKT|-80|0|",
			"Asia/Hovd|HOVT|-70|0|",
			"Asia/Irkutsk|IRKT IRKST IRKT|-80 -90 -90|01020|1BWi0 1qM0 WM0 8Hz0",
			"Asia/Istanbul|EET EEST|-20 -30|01010101010101010101010|1BWp0 1qM0 Xc0 1qo0 WM0 1qM0 11A0 1o00 1200 1nA0 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Asia/Jakarta|WIB|-70|0|",
			"Asia/Jayapura|WIT|-90|0|",
			"Asia/Jerusalem|IST IDT|-20 -30|01010101010101010101010|1BVA0 17X0 1kp0 1dz0 1c10 1aL0 1eN0 1oL0 10N0 1oL0 10N0 1oL0 10N0 1rz0 W10 1rz0 W10 1rz0 10N0 1oL0 10N0 1oL0",
			"Asia/Kabul|AFT|-4u|0|",
			"Asia/Kamchatka|PETT PETST PETT|-c0 -c0 -b0|0120|1BWe0 1qN0 WM0",
			"Asia/Karachi|PKT|-50|0|",
			"Asia/Kashgar|XJT|-60|0|",
			"Asia/Kathmandu|NPT|-5J|0|",
			"Asia/Khandyga|VLAT VLAST VLAT YAKT YAKT|-a0 -b0 -b0 -a0 -90|010234|1BWg0 1qM0 WM0 17V0 7zD0",
			"Asia/Krasnoyarsk|KRAT KRAST KRAT|-70 -80 -80|01020|1BWj0 1qM0 WM0 8Hz0",
			"Asia/Kuala_Lumpur|MYT|-80|0|",
			"Asia/Magadan|MAGT MAGST MAGT MAGT|-b0 -c0 -c0 -a0|01023|1BWf0 1qM0 WM0 8Hz0",
			"Asia/Makassar|WITA|-80|0|",
			"Asia/Manila|PHT|-80|0|",
			"Asia/Nicosia|EET EEST|-20 -30|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Asia/Novokuznetsk|KRAT NOVST NOVT NOVT|-70 -70 -60 -70|01230|1BWj0 1qN0 WM0 8Hz0",
			"Asia/Novosibirsk|NOVT NOVST NOVT|-60 -70 -70|01020|1BWk0 1qM0 WM0 8Hz0",
			"Asia/Omsk|OMST OMSST OMST|-60 -70 -70|01020|1BWk0 1qM0 WM0 8Hz0",
			"Asia/Oral|ORAT|-50|0|",
			"Asia/Pyongyang|KST|-90|0|",
			"Asia/Qyzylorda|QYZT|-60|0|",
			"Asia/Rangoon|MMT|-6u|0|",
			"Asia/Sakhalin|SAKT SAKST SAKT|-a0 -b0 -b0|01020|1BWg0 1qM0 WM0 8Hz0",
			"Asia/Samarkand|UZT|-50|0|",
			"Asia/Singapore|SGT|-80|0|",
			"Asia/Srednekolymsk|MAGT MAGST MAGT SRET|-b0 -c0 -c0 -b0|01023|1BWf0 1qM0 WM0 8Hz0",
			"Asia/Tbilisi|GET|-40|0|",
			"Asia/Tehran|IRST IRDT|-3u -4u|01010101010101010101010|1BTUu 1dz0 1cp0 1dz0 1cp0 1dz0 1cN0 1dz0 1cp0 1dz0 1cp0 1dz0 1cp0 1dz0 1cN0 1dz0 1cp0 1dz0 1cp0 1dz0 1cp0 1dz0",
			"Asia/Thimbu|BTT|-60|0|",
			"Asia/Tokyo|JST|-90|0|",
			"Asia/Ulaanbaatar|ULAT|-80|0|",
			"Asia/Ust-Nera|MAGT MAGST MAGT VLAT VLAT|-b0 -c0 -c0 -b0 -a0|010234|1BWf0 1qM0 WM0 17V0 7zD0",
			"Asia/Vladivostok|VLAT VLAST VLAT|-a0 -b0 -b0|01020|1BWg0 1qM0 WM0 8Hz0",
			"Asia/Yakutsk|YAKT YAKST YAKT|-90 -a0 -a0|01020|1BWh0 1qM0 WM0 8Hz0",
			"Asia/Yekaterinburg|YEKT YEKST YEKT|-50 -60 -60|01020|1BWl0 1qM0 WM0 8Hz0",
			"Asia/Yerevan|AMT AMST|-40 -50|01010|1BWm0 1qM0 WM0 1qM0",
			"Atlantic/Azores|AZOT AZOST|10 0|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Atlantic/Canary|WET WEST|0 -10|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Atlantic/Cape_Verde|CVT|10|0|",
			"Atlantic/South_Georgia|GST|20|0|",
			"Atlantic/Stanley|FKST FKT|30 40|010|1C6R0 U10",
			"Australia/ACT|AEDT AEST|-b0 -a0|01010101010101010101010|1C140 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0",
			"Australia/Adelaide|ACDT ACST|-au -9u|01010101010101010101010|1C14u 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0",
			"Australia/Brisbane|AEST|-a0|0|",
			"Australia/Darwin|ACST|-9u|0|",
			"Australia/Eucla|ACWST|-8J|0|",
			"Australia/LHI|LHDT LHST|-b0 -au|01010101010101010101010|1C130 1cMu 1cLu 1cMu 1cLu 1fAu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1fAu 1cLu 1cMu 1cLu 1cMu",
			"Australia/Perth|AWST|-80|0|",
			"Chile/EasterIsland|EASST EAST|50 60|01010101010101010101010|1C1f0 1fB0 1nX0 G10 1EL0 Op0 1zb0 Rd0 1wn0 Rd0 1wn0 Rd0 1wn0 Rd0 1wn0 Rd0 1zb0 Op0 1zb0 Rd0 1wn0 Rd0",
			"Eire|GMT IST|0 -10|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Etc/GMT+1|GMT+1|10|0|",
			"Etc/GMT+10|GMT+10|a0|0|",
			"Etc/GMT+11|GMT+11|b0|0|",
			"Etc/GMT+12|GMT+12|c0|0|",
			"Etc/GMT+2|GMT+2|20|0|",
			"Etc/GMT+3|GMT+3|30|0|",
			"Etc/GMT+4|GMT+4|40|0|",
			"Etc/GMT+5|GMT+5|50|0|",
			"Etc/GMT+6|GMT+6|60|0|",
			"Etc/GMT+7|GMT+7|70|0|",
			"Etc/GMT+8|GMT+8|80|0|",
			"Etc/GMT+9|GMT+9|90|0|",
			"Etc/GMT-1|GMT-1|-10|0|",
			"Etc/GMT-10|GMT-10|-a0|0|",
			"Etc/GMT-11|GMT-11|-b0|0|",
			"Etc/GMT-12|GMT-12|-c0|0|",
			"Etc/GMT-13|GMT-13|-d0|0|",
			"Etc/GMT-14|GMT-14|-e0|0|",
			"Etc/GMT-2|GMT-2|-20|0|",
			"Etc/GMT-3|GMT-3|-30|0|",
			"Etc/GMT-4|GMT-4|-40|0|",
			"Etc/GMT-5|GMT-5|-50|0|",
			"Etc/GMT-6|GMT-6|-60|0|",
			"Etc/GMT-7|GMT-7|-70|0|",
			"Etc/GMT-8|GMT-8|-80|0|",
			"Etc/GMT-9|GMT-9|-90|0|",
			"Etc/UCT|UCT|0|0|",
			"Etc/UTC|UTC|0|0|",
			"Europe/Belfast|GMT BST|0 -10|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"Europe/Kaliningrad|EET EEST FET|-20 -30 -30|01020|1BWo0 1qM0 WM0 8Hz0",
			"Europe/Minsk|EET EEST FET MSK|-20 -30 -30 -30|01023|1BWo0 1qM0 WM0 8Hy0",
			"Europe/Moscow|MSK MSD MSK|-30 -40 -40|01020|1BWn0 1qM0 WM0 8Hz0",
			"Europe/Samara|SAMT SAMST SAMT|-40 -40 -30|0120|1BWm0 1qN0 WM0",
			"Europe/Simferopol|EET EEST MSK MSK|-20 -30 -40 -30|01010101023|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11z0 1nW0",
			"Europe/Volgograd|MSK MSK|-30 -40|01010|1BWn0 1qM0 WM0 8Hz0",
			"HST|HST|a0|0|",
			"Indian/Chagos|IOT|-60|0|",
			"Indian/Christmas|CXT|-70|0|",
			"Indian/Cocos|CCT|-6u|0|",
			"Indian/Kerguelen|TFT|-50|0|",
			"Indian/Mahe|SCT|-40|0|",
			"Indian/Maldives|MVT|-50|0|",
			"Indian/Mauritius|MUT|-40|0|",
			"Indian/Reunion|RET|-40|0|",
			"Kwajalein|MHT|-c0|0|",
			"MET|MET MEST|-10 -20|01010101010101010101010|1BWp0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00",
			"NZ-CHAT|CHADT CHAST|-dJ -cJ|01010101010101010101010|1C120 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00",
			"Pacific/Apia|SST SDT WSDT WSST|b0 a0 -e0 -d0|01012323232323232323232|1Dbn0 1ff0 1a00 CI0 AQ0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00",
			"Pacific/Bougainville|PGT BST|-a0 -b0|01|1NwE0",
			"Pacific/Chuuk|CHUT|-a0|0|",
			"Pacific/Efate|VUT|-b0|0|",
			"Pacific/Enderbury|PHOT|-d0|0|",
			"Pacific/Fakaofo|TKT TKT|b0 -d0|01|1Gfn0",
			"Pacific/Fiji|FJST FJT|-d0 -c0|01010101010101010101010|1BWe0 1o00 Rc0 1wo0 Ao0 1Nc0 Ao0 1Q00 xz0 1SN0 uM0 1SM0 xA0 1SM0 uM0 1SM0 uM0 1SM0 uM0 1SM0 uM0 1SM0",
			"Pacific/Funafuti|TVT|-c0|0|",
			"Pacific/Galapagos|GALT|60|0|",
			"Pacific/Gambier|GAMT|90|0|",
			"Pacific/Guadalcanal|SBT|-b0|0|",
			"Pacific/Guam|ChST|-a0|0|",
			"Pacific/Kiritimati|LINT|-e0|0|",
			"Pacific/Kosrae|KOST|-b0|0|",
			"Pacific/Marquesas|MART|9u|0|",
			"Pacific/Midway|SST|b0|0|",
			"Pacific/Nauru|NRT|-c0|0|",
			"Pacific/Niue|NUT|b0|0|",
			"Pacific/Norfolk|NFT|-bu|0|",
			"Pacific/Noumea|NCT|-b0|0|",
			"Pacific/Palau|PWT|-90|0|",
			"Pacific/Pohnpei|PONT|-b0|0|",
			"Pacific/Port_Moresby|PGT|-a0|0|",
			"Pacific/Rarotonga|CKT|a0|0|",
			"Pacific/Tahiti|TAHT|a0|0|",
			"Pacific/Tarawa|GILT|-c0|0|",
			"Pacific/Tongatapu|TOT|-d0|0|",
			"Pacific/Wake|WAKT|-c0|0|",
			"Pacific/Wallis|WFT|-c0|0|"
		],
		"links": [
			"Africa/Abidjan|Africa/Accra",
			"Africa/Abidjan|Africa/Bamako",
			"Africa/Abidjan|Africa/Banjul",
			"Africa/Abidjan|Africa/Bissau",
			"Africa/Abidjan|Africa/Conakry",
			"Africa/Abidjan|Africa/Dakar",
			"Africa/Abidjan|Africa/Freetown",
			"Africa/Abidjan|Africa/Lome",
			"Africa/Abidjan|Africa/Monrovia",
			"Africa/Abidjan|Africa/Nouakchott",
			"Africa/Abidjan|Africa/Ouagadougou",
			"Africa/Abidjan|Africa/Sao_Tome",
			"Africa/Abidjan|Africa/Timbuktu",
			"Africa/Abidjan|America/Danmarkshavn",
			"Africa/Abidjan|Atlantic/Reykjavik",
			"Africa/Abidjan|Atlantic/St_Helena",
			"Africa/Abidjan|Etc/GMT",
			"Africa/Abidjan|Etc/GMT+0",
			"Africa/Abidjan|Etc/GMT-0",
			"Africa/Abidjan|Etc/GMT0",
			"Africa/Abidjan|Etc/Greenwich",
			"Africa/Abidjan|GMT",
			"Africa/Abidjan|GMT+0",
			"Africa/Abidjan|GMT-0",
			"Africa/Abidjan|GMT0",
			"Africa/Abidjan|Greenwich",
			"Africa/Abidjan|Iceland",
			"Africa/Addis_Ababa|Africa/Asmara",
			"Africa/Addis_Ababa|Africa/Asmera",
			"Africa/Addis_Ababa|Africa/Dar_es_Salaam",
			"Africa/Addis_Ababa|Africa/Djibouti",
			"Africa/Addis_Ababa|Africa/Juba",
			"Africa/Addis_Ababa|Africa/Kampala",
			"Africa/Addis_Ababa|Africa/Khartoum",
			"Africa/Addis_Ababa|Africa/Mogadishu",
			"Africa/Addis_Ababa|Africa/Nairobi",
			"Africa/Addis_Ababa|Indian/Antananarivo",
			"Africa/Addis_Ababa|Indian/Comoro",
			"Africa/Addis_Ababa|Indian/Mayotte",
			"Africa/Algiers|Africa/Tunis",
			"Africa/Bangui|Africa/Brazzaville",
			"Africa/Bangui|Africa/Douala",
			"Africa/Bangui|Africa/Kinshasa",
			"Africa/Bangui|Africa/Lagos",
			"Africa/Bangui|Africa/Libreville",
			"Africa/Bangui|Africa/Luanda",
			"Africa/Bangui|Africa/Malabo",
			"Africa/Bangui|Africa/Ndjamena",
			"Africa/Bangui|Africa/Niamey",
			"Africa/Bangui|Africa/Porto-Novo",
			"Africa/Blantyre|Africa/Bujumbura",
			"Africa/Blantyre|Africa/Gaborone",
			"Africa/Blantyre|Africa/Harare",
			"Africa/Blantyre|Africa/Kigali",
			"Africa/Blantyre|Africa/Lubumbashi",
			"Africa/Blantyre|Africa/Lusaka",
			"Africa/Blantyre|Africa/Maputo",
			"Africa/Cairo|Egypt",
			"Africa/Casablanca|Africa/El_Aaiun",
			"Africa/Ceuta|Arctic/Longyearbyen",
			"Africa/Ceuta|Atlantic/Jan_Mayen",
			"Africa/Ceuta|CET",
			"Africa/Ceuta|Europe/Amsterdam",
			"Africa/Ceuta|Europe/Andorra",
			"Africa/Ceuta|Europe/Belgrade",
			"Africa/Ceuta|Europe/Berlin",
			"Africa/Ceuta|Europe/Bratislava",
			"Africa/Ceuta|Europe/Brussels",
			"Africa/Ceuta|Europe/Budapest",
			"Africa/Ceuta|Europe/Busingen",
			"Africa/Ceuta|Europe/Copenhagen",
			"Africa/Ceuta|Europe/Gibraltar",
			"Africa/Ceuta|Europe/Ljubljana",
			"Africa/Ceuta|Europe/Luxembourg",
			"Africa/Ceuta|Europe/Madrid",
			"Africa/Ceuta|Europe/Malta",
			"Africa/Ceuta|Europe/Monaco",
			"Africa/Ceuta|Europe/Oslo",
			"Africa/Ceuta|Europe/Paris",
			"Africa/Ceuta|Europe/Podgorica",
			"Africa/Ceuta|Europe/Prague",
			"Africa/Ceuta|Europe/Rome",
			"Africa/Ceuta|Europe/San_Marino",
			"Africa/Ceuta|Europe/Sarajevo",
			"Africa/Ceuta|Europe/Skopje",
			"Africa/Ceuta|Europe/Stockholm",
			"Africa/Ceuta|Europe/Tirane",
			"Africa/Ceuta|Europe/Vaduz",
			"Africa/Ceuta|Europe/Vatican",
			"Africa/Ceuta|Europe/Vienna",
			"Africa/Ceuta|Europe/Warsaw",
			"Africa/Ceuta|Europe/Zagreb",
			"Africa/Ceuta|Europe/Zurich",
			"Africa/Ceuta|Poland",
			"Africa/Johannesburg|Africa/Maseru",
			"Africa/Johannesburg|Africa/Mbabane",
			"Africa/Tripoli|Libya",
			"America/Adak|America/Atka",
			"America/Adak|US/Aleutian",
			"America/Anchorage|America/Juneau",
			"America/Anchorage|America/Nome",
			"America/Anchorage|America/Sitka",
			"America/Anchorage|America/Yakutat",
			"America/Anchorage|US/Alaska",
			"America/Anguilla|America/Antigua",
			"America/Anguilla|America/Aruba",
			"America/Anguilla|America/Barbados",
			"America/Anguilla|America/Blanc-Sablon",
			"America/Anguilla|America/Curacao",
			"America/Anguilla|America/Dominica",
			"America/Anguilla|America/Grenada",
			"America/Anguilla|America/Guadeloupe",
			"America/Anguilla|America/Kralendijk",
			"America/Anguilla|America/Lower_Princes",
			"America/Anguilla|America/Marigot",
			"America/Anguilla|America/Martinique",
			"America/Anguilla|America/Montserrat",
			"America/Anguilla|America/Port_of_Spain",
			"America/Anguilla|America/Puerto_Rico",
			"America/Anguilla|America/Santo_Domingo",
			"America/Anguilla|America/St_Barthelemy",
			"America/Anguilla|America/St_Kitts",
			"America/Anguilla|America/St_Lucia",
			"America/Anguilla|America/St_Thomas",
			"America/Anguilla|America/St_Vincent",
			"America/Anguilla|America/Tortola",
			"America/Anguilla|America/Virgin",
			"America/Argentina/Buenos_Aires|America/Argentina/Catamarca",
			"America/Argentina/Buenos_Aires|America/Argentina/ComodRivadavia",
			"America/Argentina/Buenos_Aires|America/Argentina/Cordoba",
			"America/Argentina/Buenos_Aires|America/Argentina/Jujuy",
			"America/Argentina/Buenos_Aires|America/Argentina/La_Rioja",
			"America/Argentina/Buenos_Aires|America/Argentina/Mendoza",
			"America/Argentina/Buenos_Aires|America/Argentina/Rio_Gallegos",
			"America/Argentina/Buenos_Aires|America/Argentina/Salta",
			"America/Argentina/Buenos_Aires|America/Argentina/San_Juan",
			"America/Argentina/Buenos_Aires|America/Argentina/San_Luis",
			"America/Argentina/Buenos_Aires|America/Argentina/Tucuman",
			"America/Argentina/Buenos_Aires|America/Argentina/Ushuaia",
			"America/Argentina/Buenos_Aires|America/Buenos_Aires",
			"America/Argentina/Buenos_Aires|America/Catamarca",
			"America/Argentina/Buenos_Aires|America/Cordoba",
			"America/Argentina/Buenos_Aires|America/Jujuy",
			"America/Argentina/Buenos_Aires|America/Mendoza",
			"America/Argentina/Buenos_Aires|America/Rosario",
			"America/Atikokan|America/Cayman",
			"America/Atikokan|America/Coral_Harbour",
			"America/Atikokan|America/Jamaica",
			"America/Atikokan|America/Panama",
			"America/Atikokan|EST",
			"America/Atikokan|Jamaica",
			"America/Belem|America/Fortaleza",
			"America/Belem|America/Maceio",
			"America/Belem|America/Recife",
			"America/Belem|America/Santarem",
			"America/Belize|America/Costa_Rica",
			"America/Belize|America/El_Salvador",
			"America/Belize|America/Guatemala",
			"America/Belize|America/Managua",
			"America/Belize|America/Regina",
			"America/Belize|America/Swift_Current",
			"America/Belize|America/Tegucigalpa",
			"America/Belize|Canada/East-Saskatchewan",
			"America/Belize|Canada/Saskatchewan",
			"America/Boa_Vista|America/Manaus",
			"America/Boa_Vista|America/Porto_Velho",
			"America/Boa_Vista|Brazil/West",
			"America/Boise|America/Cambridge_Bay",
			"America/Boise|America/Denver",
			"America/Boise|America/Edmonton",
			"America/Boise|America/Inuvik",
			"America/Boise|America/Ojinaga",
			"America/Boise|America/Shiprock",
			"America/Boise|America/Yellowknife",
			"America/Boise|Canada/Mountain",
			"America/Boise|MST7MDT",
			"America/Boise|Navajo",
			"America/Boise|US/Mountain",
			"America/Campo_Grande|America/Cuiaba",
			"America/Cancun|America/Merida",
			"America/Cancun|America/Mexico_City",
			"America/Cancun|America/Monterrey",
			"America/Cancun|Mexico/General",
			"America/Chicago|America/Indiana/Knox",
			"America/Chicago|America/Indiana/Tell_City",
			"America/Chicago|America/Knox_IN",
			"America/Chicago|America/Matamoros",
			"America/Chicago|America/Menominee",
			"America/Chicago|America/North_Dakota/Center",
			"America/Chicago|America/North_Dakota/New_Salem",
			"America/Chicago|America/Rainy_River",
			"America/Chicago|America/Rankin_Inlet",
			"America/Chicago|America/Resolute",
			"America/Chicago|America/Winnipeg",
			"America/Chicago|CST6CDT",
			"America/Chicago|Canada/Central",
			"America/Chicago|US/Central",
			"America/Chicago|US/Indiana-Starke",
			"America/Chihuahua|America/Mazatlan",
			"America/Chihuahua|Mexico/BajaSur",
			"America/Creston|America/Dawson_Creek",
			"America/Creston|America/Hermosillo",
			"America/Creston|America/Phoenix",
			"America/Creston|MST",
			"America/Creston|US/Arizona",
			"America/Dawson|America/Ensenada",
			"America/Dawson|America/Los_Angeles",
			"America/Dawson|America/Tijuana",
			"America/Dawson|America/Vancouver",
			"America/Dawson|America/Whitehorse",
			"America/Dawson|Canada/Pacific",
			"America/Dawson|Canada/Yukon",
			"America/Dawson|Mexico/BajaNorte",
			"America/Dawson|PST8PDT",
			"America/Dawson|US/Pacific",
			"America/Dawson|US/Pacific-New",
			"America/Detroit|America/Fort_Wayne",
			"America/Detroit|America/Indiana/Indianapolis",
			"America/Detroit|America/Indiana/Marengo",
			"America/Detroit|America/Indiana/Petersburg",
			"America/Detroit|America/Indiana/Vevay",
			"America/Detroit|America/Indiana/Vincennes",
			"America/Detroit|America/Indiana/Winamac",
			"America/Detroit|America/Indianapolis",
			"America/Detroit|America/Iqaluit",
			"America/Detroit|America/Kentucky/Louisville",
			"America/Detroit|America/Kentucky/Monticello",
			"America/Detroit|America/Louisville",
			"America/Detroit|America/Montreal",
			"America/Detroit|America/Nassau",
			"America/Detroit|America/New_York",
			"America/Detroit|America/Nipigon",
			"America/Detroit|America/Pangnirtung",
			"America/Detroit|America/Thunder_Bay",
			"America/Detroit|America/Toronto",
			"America/Detroit|Canada/Eastern",
			"America/Detroit|EST5EDT",
			"America/Detroit|US/East-Indiana",
			"America/Detroit|US/Eastern",
			"America/Detroit|US/Michigan",
			"America/Eirunepe|America/Porto_Acre",
			"America/Eirunepe|America/Rio_Branco",
			"America/Eirunepe|Brazil/Acre",
			"America/Glace_Bay|America/Halifax",
			"America/Glace_Bay|America/Moncton",
			"America/Glace_Bay|America/Thule",
			"America/Glace_Bay|Atlantic/Bermuda",
			"America/Glace_Bay|Canada/Atlantic",
			"America/Havana|Cuba",
			"America/Metlakatla|Pacific/Pitcairn",
			"America/Noronha|Brazil/DeNoronha",
			"America/Santiago|Antarctica/Palmer",
			"America/Santiago|Chile/Continental",
			"America/Sao_Paulo|Brazil/East",
			"America/St_Johns|Canada/Newfoundland",
			"Antarctica/McMurdo|Antarctica/South_Pole",
			"Antarctica/McMurdo|NZ",
			"Antarctica/McMurdo|Pacific/Auckland",
			"Asia/Aden|Asia/Baghdad",
			"Asia/Aden|Asia/Bahrain",
			"Asia/Aden|Asia/Kuwait",
			"Asia/Aden|Asia/Qatar",
			"Asia/Aden|Asia/Riyadh",
			"Asia/Aqtau|Asia/Aqtobe",
			"Asia/Ashgabat|Asia/Ashkhabad",
			"Asia/Bangkok|Asia/Ho_Chi_Minh",
			"Asia/Bangkok|Asia/Phnom_Penh",
			"Asia/Bangkok|Asia/Saigon",
			"Asia/Bangkok|Asia/Vientiane",
			"Asia/Calcutta|Asia/Colombo",
			"Asia/Calcutta|Asia/Kolkata",
			"Asia/Chongqing|Asia/Chungking",
			"Asia/Chongqing|Asia/Harbin",
			"Asia/Chongqing|Asia/Macao",
			"Asia/Chongqing|Asia/Macau",
			"Asia/Chongqing|Asia/Shanghai",
			"Asia/Chongqing|Asia/Taipei",
			"Asia/Chongqing|PRC",
			"Asia/Chongqing|ROC",
			"Asia/Dacca|Asia/Dhaka",
			"Asia/Dubai|Asia/Muscat",
			"Asia/Hong_Kong|Hongkong",
			"Asia/Istanbul|Europe/Istanbul",
			"Asia/Istanbul|Turkey",
			"Asia/Jakarta|Asia/Pontianak",
			"Asia/Jerusalem|Asia/Tel_Aviv",
			"Asia/Jerusalem|Israel",
			"Asia/Kashgar|Asia/Urumqi",
			"Asia/Kathmandu|Asia/Katmandu",
			"Asia/Kuala_Lumpur|Asia/Kuching",
			"Asia/Makassar|Asia/Ujung_Pandang",
			"Asia/Nicosia|EET",
			"Asia/Nicosia|Europe/Athens",
			"Asia/Nicosia|Europe/Bucharest",
			"Asia/Nicosia|Europe/Chisinau",
			"Asia/Nicosia|Europe/Helsinki",
			"Asia/Nicosia|Europe/Kiev",
			"Asia/Nicosia|Europe/Mariehamn",
			"Asia/Nicosia|Europe/Nicosia",
			"Asia/Nicosia|Europe/Riga",
			"Asia/Nicosia|Europe/Sofia",
			"Asia/Nicosia|Europe/Tallinn",
			"Asia/Nicosia|Europe/Tiraspol",
			"Asia/Nicosia|Europe/Uzhgorod",
			"Asia/Nicosia|Europe/Vilnius",
			"Asia/Nicosia|Europe/Zaporozhye",
			"Asia/Pyongyang|Asia/Seoul",
			"Asia/Pyongyang|ROK",
			"Asia/Samarkand|Asia/Tashkent",
			"Asia/Singapore|Singapore",
			"Asia/Tehran|Iran",
			"Asia/Thimbu|Asia/Thimphu",
			"Asia/Tokyo|Japan",
			"Asia/Ulaanbaatar|Asia/Ulan_Bator",
			"Atlantic/Canary|Atlantic/Faeroe",
			"Atlantic/Canary|Atlantic/Faroe",
			"Atlantic/Canary|Atlantic/Madeira",
			"Atlantic/Canary|Europe/Lisbon",
			"Atlantic/Canary|Portugal",
			"Atlantic/Canary|WET",
			"Australia/ACT|Australia/Canberra",
			"Australia/ACT|Australia/Currie",
			"Australia/ACT|Australia/Hobart",
			"Australia/ACT|Australia/Melbourne",
			"Australia/ACT|Australia/NSW",
			"Australia/ACT|Australia/Sydney",
			"Australia/ACT|Australia/Tasmania",
			"Australia/ACT|Australia/Victoria",
			"Australia/Adelaide|Australia/Broken_Hill",
			"Australia/Adelaide|Australia/South",
			"Australia/Adelaide|Australia/Yancowinna",
			"Australia/Brisbane|Australia/Lindeman",
			"Australia/Brisbane|Australia/Queensland",
			"Australia/Darwin|Australia/North",
			"Australia/LHI|Australia/Lord_Howe",
			"Australia/Perth|Australia/West",
			"Chile/EasterIsland|Pacific/Easter",
			"Eire|Europe/Dublin",
			"Etc/UCT|UCT",
			"Etc/UTC|Etc/Universal",
			"Etc/UTC|Etc/Zulu",
			"Etc/UTC|UTC",
			"Etc/UTC|Universal",
			"Etc/UTC|Zulu",
			"Europe/Belfast|Europe/Guernsey",
			"Europe/Belfast|Europe/Isle_of_Man",
			"Europe/Belfast|Europe/Jersey",
			"Europe/Belfast|Europe/London",
			"Europe/Belfast|GB",
			"Europe/Belfast|GB-Eire",
			"Europe/Moscow|W-SU",
			"HST|Pacific/Honolulu",
			"HST|Pacific/Johnston",
			"HST|US/Hawaii",
			"Kwajalein|Pacific/Kwajalein",
			"Kwajalein|Pacific/Majuro",
			"NZ-CHAT|Pacific/Chatham",
			"Pacific/Chuuk|Pacific/Truk",
			"Pacific/Chuuk|Pacific/Yap",
			"Pacific/Guam|Pacific/Saipan",
			"Pacific/Midway|Pacific/Pago_Pago",
			"Pacific/Midway|Pacific/Samoa",
			"Pacific/Midway|US/Samoa",
			"Pacific/Pohnpei|Pacific/Ponape"
		]
	});


	return moment;
}));

//! moment-timezone-utils.js
//! version : 0.3.0
//! author : Tim Wood
//! license : MIT
//! github.com/moment/moment-timezone

(function (root, factory) {
	"use strict";

	/*global define*/
	if (typeof define === 'function' && define.amd) {
		define(['moment'], factory);                 // AMD
	} else if (typeof exports === 'object') {
		module.exports = factory(require('./'));     // Node
	} else {
		factory(root.moment);                        // Browser
	}
}(this, function (moment) {
	"use strict";

	if (!moment.tz) {
		throw new Error("moment-timezone-utils.js must be loaded after moment-timezone.js");
	}

	/************************************
		Pack Base 60
	************************************/

	var BASE60 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWX',
		EPSILON = 0.000001; // Used to fix floating point rounding errors

	function packBase60Fraction(fraction, precision) {
		var buffer = '.',
			output = '',
			current;

		while (precision > 0) {
			precision  -= 1;
			fraction   *= 60;
			current     = Math.floor(fraction + EPSILON);
			buffer     += BASE60[current];
			fraction   -= current;

			// Only add buffer to output once we have a non-zero value.
			// This makes '.000' output '', and '.100' output '.1'
			if (current) {
				output += buffer;
				buffer  = '';
			}
		}

		return output;
	}

	function packBase60(number, precision) {
		var output = '',
			absolute = Math.abs(number),
			whole = Math.floor(absolute),
			fraction = packBase60Fraction(absolute - whole, Math.min(~~precision, 10));

		while (whole > 0) {
			output = BASE60[whole % 60] + output;
			whole = Math.floor(whole / 60);
		}

		if (number < 0) {
			output = '-' + output;
		}

		if (output && fraction) {
			return output + fraction;
		}

		if (!fraction && output === '-') {
			return '0';
		}

		return output || fraction || '0';
	}

	/************************************
		Pack
	************************************/

	function packUntils(untils) {
		var out = [],
			last = 0,
			i;

		for (i = 0; i < untils.length - 1; i++) {
			out[i] = packBase60(Math.round((untils[i] - last) / 1000) / 60, 1);
			last = untils[i];
		}

		return out.join(' ');
	}

	function packAbbrsAndOffsets(source) {
		var index = 0,
			abbrs = [],
			offsets = [],
			indices = [],
			map = {},
			i, key;

		for (i = 0; i < source.abbrs.length; i++) {
			key = source.abbrs[i] + '|' + source.offsets[i];
			if (map[key] === undefined) {
				map[key] = index;
				abbrs[index] = source.abbrs[i];
				offsets[index] = packBase60(Math.round(source.offsets[i] * 60) / 60, 1);
				index++;
			}
			indices[i] = packBase60(map[key], 0);
		}

		return abbrs.join(' ') + '|' + offsets.join(' ') + '|' + indices.join('');
	}

	function validatePackData (source) {
		if (!source.name)    { throw new Error("Missing name"); }
		if (!source.abbrs)   { throw new Error("Missing abbrs"); }
		if (!source.untils)  { throw new Error("Missing untils"); }
		if (!source.offsets) { throw new Error("Missing offsets"); }
		if (
			source.offsets.length !== source.untils.length ||
			source.offsets.length !== source.abbrs.length
		) {
			throw new Error("Mismatched array lengths");
		}
	}

	function pack (source) {
		validatePackData(source);
		return source.name + '|' + packAbbrsAndOffsets(source) + '|' + packUntils(source.untils);
	}

	/************************************
		Create Links
	************************************/

	function arraysAreEqual(a, b) {
		var i;

		if (a.length !== b.length) { return false; }

		for (i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) {
				return false;
			}
		}
		return true;
	}

	function zonesAreEqual(a, b) {
		return arraysAreEqual(a.offsets, b.offsets) && arraysAreEqual(a.abbrs, b.abbrs) && arraysAreEqual(a.untils, b.untils);
	}

	function findAndCreateLinks (input, output, links) {
		var i, j, a, b, isUnique;

		for (i = 0; i < input.length; i++) {
			isUnique = true;
			a = input[i];

			for (j = 0; j < output.length; j++) {
				b = output[j];

				if (zonesAreEqual(a, b)) {
					links.push(b.name + '|' + a.name);
					isUnique = false;
					continue;
				}
			}

			if (isUnique) {
				output.push(a);
			}
		}
	}

	function createLinks (source) {
		var zones = [],
			links = [];

		if (source.links) {
			links = source.links.slice();
		}

		findAndCreateLinks(source.zones, zones, links);

		return {
			version : source.version,
			zones   : zones,
			links   : links.sort()
		};
	}

	/************************************
		Filter Years
	************************************/

	function findStartAndEndIndex (untils, start, end) {
		var startI = 0,
			endI = untils.length + 1,
			untilYear,
			i;

		if (!end) {
			end = start;
		}

		if (start > end) {
			i = start;
			start = end;
			end = i;
		}

		for (i = 0; i < untils.length; i++) {
			if (untils[i] == null) {
				continue;
			}
			untilYear = new Date(untils[i]).getUTCFullYear();
			if (untilYear < start) {
				startI = i + 1;
			}
			if (untilYear > end) {
				endI = Math.min(endI, i + 1);
			}
		}

		return [startI, endI];
	}

	function filterYears (source, start, end) {
		var slice     = Array.prototype.slice,
			indices   = findStartAndEndIndex(source.untils, start, end),
			untils    = slice.apply(source.untils, indices);

		untils[untils.length - 1] = null;

		return {
			name    : source.name,
			abbrs   : slice.apply(source.abbrs, indices),
			untils  : untils,
			offsets : slice.apply(source.offsets, indices)
		};
	}

	/************************************
		Filter, Link, and Pack
	************************************/

	function filterLinkPack (input, start, end) {
		var i,
			inputZones = input.zones,
			outputZones = [],
			output;

		for (i = 0; i < inputZones.length; i++) {
			outputZones[i] = filterYears(inputZones[i], start, end);
		}

		output = createLinks({
			zones : outputZones,
			links : input.links.slice(),
			version : input.version
		});

		for (i = 0; i < output.zones.length; i++) {
			output.zones[i] = pack(output.zones[i]);
		}

		return output;
	}

	/************************************
		Exports
	************************************/

	moment.tz.pack           = pack;
	moment.tz.packBase60     = packBase60;
	moment.tz.createLinks    = createLinks;
	moment.tz.filterYears    = filterYears;
	moment.tz.filterLinkPack = filterLinkPack;

	return moment;
}));

'use strict';

(function (root, factory) {
  /* global define */
  if (typeof define === 'function' && define.amd) {
    define(['moment'], function (moment) {
      moment.parseFormat = factory(moment);
      return moment.parseFormat;
    });
  } else if (typeof exports === 'object') {
    module.exports = factory(require('moment'));
  } else {
    root.moment.parseFormat = factory(root.moment);
  }
})(this, function (/*moment*/) { // jshint ignore:line
  var dayNames =  [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var abbreviatedDayNames =  [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var shortestDayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  var monthNames =  [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var abbreviatedMonthNames =  [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var amDesignator =  'AM';
  var pmDesignator =  'PM';

  var regexDayNames = new RegExp( dayNames.join('|'), 'i' );
  var regexAbbreviatedDayNames = new RegExp( abbreviatedDayNames.join('|'), 'i' );
  var regexShortestDayNames = new RegExp( '\\b('+shortestDayNames.join('|')+')\\b', 'i' );
  var regexMonthNames = new RegExp( monthNames.join('|'), 'i' );
  var regexAbbreviatedMonthNames = new RegExp( abbreviatedMonthNames.join('|'), 'i' );

  var regexFirstSecondThirdFourth = /(\d+)(st|nd|rd|th)\b/i;
  var regexEndian = /(\d{1,4})([\/\.\-])(\d{1,2})[\/\.\-](\d{1,4})/;

  var regexTimezone = /\+\d\d:\d\d$/
  var amOrPm = '('+[amDesignator,pmDesignator].join('|')+')';
  var regexHoursWithLeadingZeroDigitMinutesSecondsAmPm = new RegExp( '0\\d\\:\\d{1,2}\\:\\d{1,2}(\\s*)' + amOrPm,  'i' );
  var regexHoursWithLeadingZeroDigitMinutesAmPm = new RegExp( '0\\d\\:\\d{1,2}(\\s*)' + amOrPm,  'i' );
  var regexHoursWithLeadingZeroDigitAmPm = new RegExp( '0\\d(\\s*)' + amOrPm,  'i' );
  var regexHoursMinutesSecondsAmPm = new RegExp( '\\d{1,2}\\:\\d{1,2}\\:\\d{1,2}(\\s*)' + amOrPm,  'i' );
  var regexHoursMinutesAmPm = new RegExp( '\\d{1,2}\\:\\d{1,2}(\\s*)' + amOrPm,  'i' );
  var regexHoursAmPm = new RegExp( '\\d{1,2}(\\s*)' + amOrPm,  'i' );

  var regexHoursWithLeadingZeroMinutesSeconds = /0\d:\d{2}:\d{2}/;
  var regexHoursWithLeadingZeroMinutes = /0\d:\d{2}/;
  var regexHoursMinutesSeconds = /\d{1,2}:\d{2}:\d{2}/;
  var regexHoursMinutes = /\d{1,2}:\d{2}/;
  var regexYearLong = /\d{4}/;
  var regexDayLeadingZero = /0\d/;
  var regexDay = /\d{1,2}/;
  var regexYearShort = /\d{2}/;

  var regexFillingWords = /\b(at)\b/i;

  // option defaults
  var defaultOrder = {
    '/': 'MDY',
    '.': 'DMY',
    '-': 'YMD'
  };

  function parseDateFormat(dateString, options) {
    var format = dateString;

    // default options
    options = options || {};
    options.preferredOrder = options.preferredOrder || defaultOrder;

    // escape filling words
    format = format.replace(regexFillingWords, '[$1]');

    //  DAYS

    // Monday ☛ dddd
    format = format.replace( regexDayNames, 'dddd');
    // Mon ☛ ddd
    format = format.replace( regexAbbreviatedDayNames, 'ddd');
    // Mo ☛ dd
    format = format.replace( regexShortestDayNames, 'dd');

    // 1st, 2nd, 23rd ☛ do
    format = format.replace( regexFirstSecondThirdFourth, 'Do');

    // MONTHS

    // January ☛ MMMM
    format = format.replace( regexMonthNames, 'MMMM');
    // Jan ☛ MMM
    format = format.replace( regexAbbreviatedMonthNames, 'MMM');

    // replace endians, like 8/20/2010, 20.8.2010 or 2010-8-20
    format = format.replace( regexEndian, replaceEndian.bind(null, options));

    // TIME

    // timezone +02:00 ☛ Z
    format = format.replace(regexTimezone, 'Z');

    // 05:30:20pm ☛ hh:mm:ssa
    format = format.replace(regexHoursWithLeadingZeroDigitMinutesSecondsAmPm, 'hh:mm:ss$1a');
    // 10:30:20pm ☛ h:mm:ssa
    format = format.replace(regexHoursMinutesSecondsAmPm, 'h:mm:ss$1a');
    // 05:30pm ☛ hh:mma
    format = format.replace(regexHoursWithLeadingZeroDigitMinutesAmPm, 'hh:mm$1a');
    // 10:30pm ☛ h:mma
    format = format.replace(regexHoursMinutesAmPm, 'h:mm$1a');
    // 05pm ☛ hha
    format = format.replace(regexHoursWithLeadingZeroDigitAmPm, 'hh$1a');
    // 10pm ☛ ha
    format = format.replace(regexHoursAmPm, 'h$1a');
    // 05:30:20 ☛ HH:mm:ss
    format = format.replace(regexHoursWithLeadingZeroMinutesSeconds, 'HH:mm:ss');
    // 10:30:20 ☛ H:mm:ss
    format = format.replace(regexHoursMinutesSeconds, 'H:mm:ss');
    // 05:30 ☛ H:mm
    format = format.replace(regexHoursWithLeadingZeroMinutes, 'HH:mm');
    // 10:30 ☛ HH:mm
    format = format.replace(regexHoursMinutes, 'H:mm');

    // do we still have numbers left?

    // Lets check for 4 digits first, these are years for sure
    format = format.replace(regexYearLong, 'YYYY');

    // now, the next number, if existing, must be a day
    format = format.replace(regexDayLeadingZero, 'DD');
    format = format.replace(regexDay, 'D');

    // last but not least, there could still be a year left
    format = format.replace(regexYearShort, 'YY');

    return format;
  }

  // if we can't find an endian based on the separator, but
  // there still is a short date with day, month & year,
  // we try to make a smart decision to identify the order
  function replaceEndian(options, matchedPart, first, separator, second, third) {
    var parts;
    var hasSingleDigit = Math.min(first.length, second.length, third.length) === 1;
    var hasQuadDigit = Math.max(first.length, second.length, third.length) === 4;
    var index = -1;
    var preferredOrder = typeof options.preferredOrder === 'string' ? options.preferredOrder : options.preferredOrder[separator];

    first = parseInt(first, 10);
    second = parseInt(second, 10);
    third = parseInt(third, 10);
    parts = [first, second, third];
    preferredOrder = preferredOrder.toUpperCase();

    // If first is a year, order will always be Year-Month-Day
    if (first > 31) {
      parts[0] = hasQuadDigit ? 'YYYY' : 'YY';
      parts[1] = hasSingleDigit ? 'M' : 'MM';
      parts[2] = hasSingleDigit ? 'D' : 'DD';
      return parts.join(separator);
    }

    // Second will never be the year. And if it is a day,
    // the order will always be Month-Day-Year
    if (second > 12) {
      parts[0] = hasSingleDigit ? 'M' : 'MM';
      parts[1] = hasSingleDigit ? 'D' : 'DD';
      parts[2] = hasQuadDigit ? 'YYYY' : 'YY';
      return parts.join(separator);
    }

    // if third is a year ...
    if (third > 31) {
      parts[2] = hasQuadDigit ? 'YYYY' : 'YY';

      // ... try to find day in first and second.
      // If found, the remaining part is the month.
      index = first > 12 ? 0 : second > 12 ? 1 : -1;
      if (index !== -1) {
        parts[index] = hasSingleDigit ? 'D' : 'DD';
        index = index === 0 ? 1 : 0;
        parts[index] = hasSingleDigit ? 'M' : 'MM';
        return parts.join(separator);
      }
    }

    // if we had no luck until here, we use the preferred order
    parts[preferredOrder.indexOf('D')] = hasSingleDigit ? 'D' : 'DD';
    parts[preferredOrder.indexOf('M')] = hasSingleDigit ? 'M' : 'MM';
    parts[preferredOrder.indexOf('Y')] = hasQuadDigit ? 'YYYY' : 'YY';

    return parts.join(separator);
  }

  return parseDateFormat;
});

(function($) {
  $.fn.caret = function(pos) {
    var target = this[0];
  var isContentEditable = target.contentEditable === 'true';
    //get
    if (arguments.length == 0) {
      //HTML5
      if (window.getSelection) {
        //contenteditable
        if (isContentEditable) {
          target.focus();
          var range1 = window.getSelection().getRangeAt(0),
              range2 = range1.cloneRange();
          range2.selectNodeContents(target);
          range2.setEnd(range1.endContainer, range1.endOffset);
          return range2.toString().length;
        }
        //textarea
        return target.selectionStart;
      }
      //IE<9
      if (document.selection) {
        target.focus();
        //contenteditable
        if (isContentEditable) {
            var range1 = document.selection.createRange(),
                range2 = document.body.createTextRange();
            range2.moveToElementText(target);
            range2.setEndPoint('EndToEnd', range1);
            return range2.text.length;
        }
        //textarea
        var pos = 0,
            range = target.createTextRange(),
            range2 = document.selection.createRange().duplicate(),
            bookmark = range2.getBookmark();
        range.moveToBookmark(bookmark);
        while (range.moveStart('character', -1) !== 0) pos++;
        return pos;
      }
      // Addition for jsdom support
      if (target.selectionStart)
        return target.selectionStart;
      //not supported
      return 0;
    }
    //set
    if (pos == -1)
      pos = this[isContentEditable? 'text' : 'val']().length;
    //HTML5
    if (window.getSelection) {
      //contenteditable
      if (isContentEditable) {
        target.focus();
        window.getSelection().collapse(target.firstChild, pos);
      }
      //textarea
      else
        target.setSelectionRange(pos, pos);
    }
    //IE<9
    else if (document.body.createTextRange) {
      var range = document.body.createTextRange();
      range.moveToElementText(target);
      range.moveStart('character', pos);
      range.collapse(true);
      range.select();
    }
    if (!isContentEditable)
      target.focus();
    return pos;
  }
})(jQuery);

// Generated by CoffeeScript 1.7.1
(function() {
  var $, checkForCountryChange_, formatBack_, formatForPhone_, formatUp_, format_, formats, formattedPhoneNumber_, formattedPhone_, isEventAllowedChar_, isEventAllowed_, mobilePhoneNumber, prefixesAreSubsets_, restrictEventAndFormat_, supportSelectionEnd,
    __slice = [].slice;

  $ = jQuery;

  supportSelectionEnd = 'selectionEnd' in document.createElement('input');

  formatForPhone_ = function(phone, defaultPrefix) {
    var bestFormat, format, k, precision, prefix, v;
    if (defaultPrefix == null) {
      defaultPrefix = null;
    }
    if (phone.indexOf('+') !== 0 && defaultPrefix) {
      phone = defaultPrefix + phone.replace(/[^0-9]/g, '');
    } else {
      phone = '+' + phone.replace(/[^0-9]/g, '');
    }
    bestFormat = null;
    precision = 0;
    for (prefix in formats) {
      format = formats[prefix];
      if (phone.length >= prefix.length && phone.substring(0, prefix.length) === prefix && prefix.length > precision) {
        bestFormat = {};
        for (k in format) {
          v = format[k];
          bestFormat[k] = v;
        }
        bestFormat.prefix = prefix;
        precision = prefix.length;
      }
    }
    return bestFormat;
  };

  prefixesAreSubsets_ = function(prefixA, prefixB) {
    if (prefixA === prefixB) {
      return true;
    }
    if (prefixA.length < prefixB.length) {
      return prefixB.substring(0, prefixA.length) === prefixA;
    }
    return prefixA.substring(0, prefixB.length) === prefixB;
  };

  formattedPhoneNumber_ = function(phone, lastChar, defaultPrefix) {
    var format, formatChar, formatDigitCount, formattedPhone, i, phoneDigits, phoneFormat, phonePrefix, prefixPhoneFormat, _i, _j, _len, _ref;
    if (defaultPrefix == null) {
      defaultPrefix = null;
    }
    if (phone.length !== 0 && (phone.substring(0, 1) === "+" || defaultPrefix)) {
      format = formatForPhone_(phone, defaultPrefix);
      if (format && format.format) {
        phoneFormat = format.format;
        phonePrefix = format.prefix;
        if (defaultPrefix) {
          if ((defaultPrefix === phonePrefix || prefixesAreSubsets_(phonePrefix, defaultPrefix)) && (phone.indexOf('+') !== 0 || phone.length === 0)) {
            phoneFormat = phoneFormat.substring(Math.min(phonePrefix.length, defaultPrefix.length) + 1);
            if (format.nationalPrefix != null) {
              prefixPhoneFormat = "";
              for (i = _i = 0, _ref = format.nationalPrefix.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
                prefixPhoneFormat += ".";
              }
              phoneFormat = prefixPhoneFormat + phoneFormat;
            }
          }
        }
        if (phone.substring(0, 1) === "+") {
          phoneDigits = phone.substring(1);
        } else {
          phoneDigits = phone;
        }
        formatDigitCount = phoneFormat.match(/\./g).length;
        formattedPhone = "";
        for (_j = 0, _len = phoneFormat.length; _j < _len; _j++) {
          formatChar = phoneFormat[_j];
          if (formatChar === ".") {
            if (phoneDigits.length === 0) {
              break;
            }
            formattedPhone += phoneDigits.substring(0, 1);
            phoneDigits = phoneDigits.substring(1);
          } else if (lastChar || phoneDigits.length > 0) {
            formattedPhone += formatChar;
          }
        }
        phone = formattedPhone + phoneDigits;
      }
    }
    return phone;
  };

  isEventAllowed_ = function(e) {
    if (e.metaKey) {
      return true;
    }
    if (e.which === 32) {
      return false;
    }
    if (e.which === 0) {
      return true;
    }
    if (e.which < 33) {
      return true;
    }
    return isEventAllowedChar_(e);
  };

  isEventAllowedChar_ = function(e) {
    var char;
    char = String.fromCharCode(e.which);
    return !!/[\d\s+]/.test(char);
  };

  restrictEventAndFormat_ = function(e) {
    var caretEnd, selection, selectionAtEnd, value;
    if (!isEventAllowed_(e)) {
      return e.preventDefault();
    }
    if (!isEventAllowedChar_(e)) {
      return;
    }
    value = this.val();
    caretEnd = supportSelectionEnd ? this.get(0).selectionEnd : this.caret();
    value = value.substring(0, this.caret()) + String.fromCharCode(e.which) + value.substring(caretEnd, value.length);
    selection = this.caret();
    selectionAtEnd = selection === this.val().length;
    format_.call(this, value, e);
    if (!selectionAtEnd) {
      return this.caret(this.val().length);
    }
  };

  formatUp_ = function(e) {
    var value;
    checkForCountryChange_.call(this);
    value = this.val();
    if (e.keyCode === 8 && this.caret() === value.length) {
      return;
    }
    return format_.call(this, value, e);
  };

  formatBack_ = function(e) {
    var phone, value;
    if (!e) {
      return;
    }
    if (e.meta) {
      return;
    }
    value = this.val();
    if (value.length === 0) {
      return;
    }
    if (!(this.caret() === value.length)) {
      return;
    }
    if (e.keyCode !== 8) {
      return;
    }
    value = value.substring(0, value.length - 1);
    e.preventDefault();
    phone = formattedPhone_.call(this, value, false);
    if (this.val() !== phone) {
      return this.val(phone);
    }
  };

  format_ = function(value, e) {
    var phone, selection, selectionAtEnd;
    phone = formattedPhone_.call(this, value, true);
    if (phone !== this.val()) {
      selection = this.caret();
      selectionAtEnd = selection === this.val().length;
      e.preventDefault();
      this.val(phone);
      if (!selectionAtEnd) {
        return this.caret(selection);
      }
    }
  };

  formattedPhone_ = function(phone, lastChar) {
    if (phone.indexOf('+') !== 0 && this.data('defaultPrefix')) {
      phone = phone.replace(/[^0-9]/g, '');
    } else {
      phone = '+' + phone.replace(/[^0-9]/g, '');
    }
    return formattedPhoneNumber_(phone, lastChar, this.data('defaultPrefix'));
  };

  checkForCountryChange_ = function() {
    var country, format, phone;
    phone = this.val();
    format = formatForPhone_(phone, this.data('defaultPrefix'));
    country = null;
    if (format) {
      country = format.country;
    }
    if (this.data('mobilePhoneCountry') !== country) {
      this.data('mobilePhoneCountry', country);
      return this.trigger('country.mobilePhoneNumber', country);
    }
  };

  mobilePhoneNumber = {};

  mobilePhoneNumber.init = function(options) {
    var _ref;
    if (options == null) {
      options = {};
    }
    if (!this.data('mobilePhoneNumberInited')) {
      this.data('mobilePhoneNumberInited', true);
      this.bind('keypress', (function(_this) {
        return function() {
          return restrictEventAndFormat_.apply($(_this), arguments);
        };
      })(this));
      this.bind('keyup', (function(_this) {
        return function() {
          return formatUp_.apply($(_this), arguments);
        };
      })(this));
      this.bind('keydown', (function(_this) {
        return function() {
          return formatBack_.apply($(_this), arguments);
        };
      })(this));
    }
    return this.data('defaultPrefix', (_ref = options.allowPhoneWithoutPrefix) != null ? _ref : options.defaultPrefix);
  };

  mobilePhoneNumber.val = function() {
    var format, val;
    val = this.val().replace(/[^0-9]/g, '');
    format = formatForPhone_(val, this.data('defaultPrefix'));
    if (this.val().indexOf('+') === 0 || (this.data('defaultPrefix') == null)) {
      return '+' + val;
    } else {
      return this.data('defaultPrefix') + val;
    }
  };

  mobilePhoneNumber.validate = function() {
    var format, val;
    val = this.mobilePhoneNumber('val');
    format = formatForPhone_(val, this.data('defaultPrefix'));
    if (!format) {
      return true;
    }
    return val.length > format.prefix.length;
  };

  mobilePhoneNumber.country = function() {
    var format;
    format = formatForPhone_(this.mobilePhoneNumber('val'));
    if (format) {
      return format.country;
    }
  };

  mobilePhoneNumber.prefix = function() {
    var countryCode;
    countryCode = this.mobilePhoneNumber('country');
    if (countryCode == null) {
      return "";
    }
    return $.mobilePhoneNumberPrefixFromCountryCode(countryCode);
  };

  $.fn.mobilePhoneNumber = function() {
    var args, method;
    method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if ((method == null) || !(typeof method === 'string')) {
      if (method != null) {
        args = [method];
      }
      method = 'init';
    }
    return mobilePhoneNumber[method].apply(this, args);
  };

  $.formatMobilePhoneNumber = function(phone) {
    phone = '+' + phone.replace(/[^0-9\*]/g, '');
    return formattedPhoneNumber_(phone, true);
  };

  $.mobilePhoneNumberPrefixFromCountryCode = function(countryCode) {
    var format, prefix;
    for (prefix in formats) {
      format = formats[prefix];
      if (format.country.toLowerCase() === countryCode.toLowerCase()) {
        if (prefix.length === 5 && prefix[1] === '1') {
          return '+1';
        }
        return prefix;
      }
    }
    return null;
  };

  formats = {
    '+247': {
      country: 'AC'
    },
    '+376': {
      country: 'AD',
      format: '+... ... ...'
    },
    '+971': {
      country: 'AE',
      format: '+... .. ... ....'
    },
    '+93': {
      country: 'AF',
      format: '+.. .. ... ....'
    },
    '+1268': {
      country: 'AG'
    },
    '+1264': {
      country: 'AI'
    },
    '+355': {
      country: 'AL',
      format: '+... .. ... ....'
    },
    '+374': {
      country: 'AM',
      format: '+... .. ......'
    },
    '+244': {
      country: 'AO',
      format: '+... ... ... ...'
    },
    '+54': {
      country: 'AR',
      format: '+.. .. ..-....-....'
    },
    '+1684': {
      country: 'AS'
    },
    '+43': {
      country: 'AT',
      format: '+.. ... ......'
    },
    '+61': {
      country: 'AU',
      format: '+.. ... ... ...'
    },
    '+297': {
      country: 'AW',
      format: '+... ... ....'
    },
    '+994': {
      country: 'AZ',
      format: '+... .. ... .. ..'
    },
    '+387': {
      country: 'BA',
      format: '+... .. ...-...'
    },
    '+1246': {
      country: 'BB'
    },
    '+880': {
      country: 'BD',
      format: '+... ....-......'
    },
    '+32': {
      country: 'BE',
      format: '+.. ... .. .. ..'
    },
    '+226': {
      country: 'BF',
      format: '+... .. .. .. ..'
    },
    '+359': {
      country: 'BG',
      format: '+... ... ... ..'
    },
    '+973': {
      country: 'BH',
      format: '+... .... ....'
    },
    '+257': {
      country: 'BI',
      format: '+... .. .. .. ..'
    },
    '+229': {
      country: 'BJ',
      format: '+... .. .. .. ..'
    },
    '+1441': {
      country: 'BM'
    },
    '+673': {
      country: 'BN',
      format: '+... ... ....'
    },
    '+591': {
      country: 'BO',
      format: '+... ........'
    },
    '+55': {
      country: 'BR',
      format: '+.. .. .....-....'
    },
    '+1242': {
      country: 'BS'
    },
    '+975': {
      country: 'BT',
      format: '+... .. .. .. ..'
    },
    '+267': {
      country: 'BW',
      format: '+... .. ... ...'
    },
    '+375': {
      country: 'BY',
      format: '+... .. ...-..-..'
    },
    '+501': {
      country: 'BZ',
      format: '+... ...-....'
    },
    '+243': {
      country: 'CD',
      format: '+... ... ... ...'
    },
    '+236': {
      country: 'CF',
      format: '+... .. .. .. ..'
    },
    '+242': {
      country: 'CG',
      format: '+... .. ... ....'
    },
    '+41': {
      country: 'CH',
      format: '+.. .. ... .. ..'
    },
    '+225': {
      country: 'CI',
      format: '+... .. .. .. ..'
    },
    '+682': {
      country: 'CK',
      format: '+... .. ...'
    },
    '+56': {
      country: 'CL',
      format: '+.. . .... ....'
    },
    '+237': {
      country: 'CM',
      format: '+... .. .. .. ..'
    },
    '+86': {
      country: 'CN',
      format: '+.. ... .... ....'
    },
    '+57': {
      country: 'CO',
      format: '+.. ... .......'
    },
    '+506': {
      country: 'CR',
      format: '+... .... ....'
    },
    '+53': {
      country: 'CU',
      format: '+.. . .......'
    },
    '+238': {
      country: 'CV',
      format: '+... ... .. ..'
    },
    '+599': {
      country: 'CW',
      format: '+... . ... ....'
    },
    '+537': {
      country: 'CY'
    },
    '+357': {
      country: 'CY',
      format: '+... .. ......'
    },
    '+420': {
      country: 'CZ',
      format: '+... ... ... ...'
    },
    '+49': {
      country: 'DE',
      format: '+.. .... .......'
    },
    '+253': {
      country: 'DJ',
      format: '+... .. .. .. ..'
    },
    '+45': {
      country: 'DK',
      format: '+.. .. .. .. ..'
    },
    '+1767': {
      country: 'DM'
    },
    '+1849': {
      country: 'DO'
    },
    '+213': {
      country: 'DZ',
      format: '+... ... .. .. ..'
    },
    '+593': {
      country: 'EC',
      format: '+... .. ... ....'
    },
    '+372': {
      country: 'EE',
      format: '+... .... ....'
    },
    '+20': {
      country: 'EG',
      format: '+.. ... ... ....'
    },
    '+291': {
      country: 'ER',
      format: '+... . ... ...'
    },
    '+34': {
      country: 'ES',
      format: '+.. ... .. .. ..'
    },
    '+251': {
      country: 'ET',
      format: '+... .. ... ....'
    },
    '+358': {
      country: 'FI',
      format: '+... .. ... .. ..'
    },
    '+679': {
      country: 'FJ',
      format: '+... ... ....'
    },
    '+500': {
      country: 'FK'
    },
    '+691': {
      country: 'FM',
      format: '+... ... ....'
    },
    '+298': {
      country: 'FO',
      format: '+... ......'
    },
    '+33': {
      country: 'FR',
      format: '+.. . .. .. .. ..'
    },
    '+241': {
      country: 'GA',
      format: '+... .. .. .. ..'
    },
    '+44': {
      country: 'GB',
      format: '+.. .... ......'
    },
    '+1473': {
      country: 'GD'
    },
    '+995': {
      country: 'GE',
      format: '+... ... .. .. ..'
    },
    '+594': {
      country: 'GF',
      format: '+... ... .. .. ..'
    },
    '+233': {
      country: 'GH',
      format: '+... .. ... ....'
    },
    '+350': {
      country: 'GI',
      format: '+... ... .....'
    },
    '+299': {
      country: 'GL',
      format: '+... .. .. ..'
    },
    '+220': {
      country: 'GM',
      format: '+... ... ....'
    },
    '+224': {
      country: 'GN',
      format: '+... ... .. .. ..'
    },
    '+240': {
      country: 'GQ',
      format: '+... ... ... ...'
    },
    '+30': {
      country: 'GR',
      format: '+.. ... ... ....'
    },
    '+502': {
      country: 'GT',
      format: '+... .... ....'
    },
    '+1671': {
      country: 'GU'
    },
    '+245': {
      country: 'GW',
      format: '+... ... ....'
    },
    '+592': {
      country: 'GY',
      format: '+... ... ....'
    },
    '+852': {
      country: 'HK',
      format: '+... .... ....'
    },
    '+504': {
      country: 'HN',
      format: '+... ....-....'
    },
    '+385': {
      country: 'HR',
      format: '+... .. ... ....'
    },
    '+509': {
      country: 'HT',
      format: '+... .. .. ....'
    },
    '+36': {
      country: 'HU',
      format: '+.. .. ... ....'
    },
    '+62': {
      country: 'ID',
      format: '+.. ...-...-...'
    },
    '+353': {
      country: 'IE',
      format: '+... .. ... ....'
    },
    '+972': {
      country: 'IL',
      format: '+... ..-...-....'
    },
    '+91': {
      country: 'IN',
      format: '+.. .. .. ......'
    },
    '+246': {
      country: 'IO',
      format: '+... ... ....'
    },
    '+964': {
      country: 'IQ',
      format: '+... ... ... ....'
    },
    '+98': {
      country: 'IR',
      format: '+.. ... ... ....'
    },
    '+354': {
      country: 'IS',
      format: '+... ... ....'
    },
    '+39': {
      country: 'IT',
      format: '+.. .. .... ....'
    },
    '+1876': {
      country: 'JM'
    },
    '+962': {
      country: 'JO',
      format: '+... . .... ....'
    },
    '+81': {
      country: 'JP',
      format: '+.. ...-...-....',
      nationalPrefix: '0'
    },
    '+254': {
      country: 'KE',
      format: '+... .. .......'
    },
    '+996': {
      country: 'KG',
      format: '+... ... ... ...'
    },
    '+855': {
      country: 'KH',
      format: '+... .. ... ...'
    },
    '+686': {
      country: 'KI'
    },
    '+269': {
      country: 'KM',
      format: '+... ... .. ..'
    },
    '+1869': {
      country: 'KN'
    },
    '+850': {
      country: 'KP',
      format: '+... ... ... ....'
    },
    '+82': {
      country: 'KR',
      format: '+.. ..-....-....'
    },
    '+965': {
      country: 'KW',
      format: '+... ... .....'
    },
    '+345': {
      country: 'KY'
    },
    '+77': {
      country: 'KZ'
    },
    '+856': {
      country: 'LA',
      format: '+... .. .. ... ...'
    },
    '+961': {
      country: 'LB',
      format: '+... .. ... ...'
    },
    '+1758': {
      country: 'LC'
    },
    '+423': {
      country: 'LI',
      format: '+... ... ... ...'
    },
    '+94': {
      country: 'LK',
      format: '+.. .. . ......'
    },
    '+231': {
      country: 'LR',
      format: '+... ... ... ...'
    },
    '+266': {
      country: 'LS',
      format: '+... .... ....'
    },
    '+370': {
      country: 'LT',
      format: '+... ... .....'
    },
    '+352': {
      country: 'LU',
      format: '+... .. .. .. ...'
    },
    '+371': {
      country: 'LV',
      format: '+... .. ... ...'
    },
    '+218': {
      country: 'LY',
      format: '+... ..-.......'
    },
    '+212': {
      country: 'MA',
      format: '+... ...-......'
    },
    '+377': {
      country: 'MC',
      format: '+... . .. .. .. ..'
    },
    '+373': {
      country: 'MD',
      format: '+... ... .. ...'
    },
    '+382': {
      country: 'ME',
      format: '+... .. ... ...'
    },
    '+590': {
      country: 'MF'
    },
    '+261': {
      country: 'MG',
      format: '+... .. .. ... ..'
    },
    '+692': {
      country: 'MH',
      format: '+... ...-....'
    },
    '+389': {
      country: 'MK',
      format: '+... .. ... ...'
    },
    '+223': {
      country: 'ML',
      format: '+... .. .. .. ..'
    },
    '+95': {
      country: 'MM',
      format: '+.. . ... ....'
    },
    '+976': {
      country: 'MN',
      format: '+... .... ....'
    },
    '+853': {
      country: 'MO',
      format: '+... .... ....'
    },
    '+1670': {
      country: 'MP'
    },
    '+596': {
      country: 'MQ',
      format: '+... ... .. .. ..'
    },
    '+222': {
      country: 'MR',
      format: '+... .. .. .. ..'
    },
    '+1664': {
      country: 'MS'
    },
    '+356': {
      country: 'MT',
      format: '+... .... ....'
    },
    '+230': {
      country: 'MU',
      format: '+... .... ....'
    },
    '+960': {
      country: 'MV',
      format: '+... ...-....'
    },
    '+265': {
      country: 'MW',
      format: '+... ... .. .. ..'
    },
    '+52': {
      country: 'MX',
      format: '+.. ... ... ... ....'
    },
    '+60': {
      country: 'MY',
      format: '+.. ..-... ....'
    },
    '+258': {
      country: 'MZ',
      format: '+... .. ... ....'
    },
    '+264': {
      country: 'NA',
      format: '+... .. ... ....'
    },
    '+687': {
      country: 'NC',
      format: '+... ........'
    },
    '+227': {
      country: 'NE',
      format: '+... .. .. .. ..'
    },
    '+672': {
      country: 'NF',
      format: '+... .. ....'
    },
    '+234': {
      country: 'NG',
      format: '+... ... ... ....'
    },
    '+505': {
      country: 'NI',
      format: '+... .... ....'
    },
    '+31': {
      country: 'NL',
      format: '+.. . ........'
    },
    '+47': {
      country: 'NO',
      format: '+.. ... .. ...'
    },
    '+977': {
      country: 'NP',
      format: '+... ...-.......'
    },
    '+674': {
      country: 'NR',
      format: '+... ... ....'
    },
    '+683': {
      country: 'NU'
    },
    '+64': {
      country: 'NZ',
      format: '+.. .. ... ....'
    },
    '+968': {
      country: 'OM',
      format: '+... .... ....'
    },
    '+507': {
      country: 'PA',
      format: '+... ....-....'
    },
    '+51': {
      country: 'PE',
      format: '+.. ... ... ...'
    },
    '+689': {
      country: 'PF',
      format: '+... .. .. ..'
    },
    '+675': {
      country: 'PG',
      format: '+... ... ....'
    },
    '+63': {
      country: 'PH',
      format: '+.. .... ......'
    },
    '+92': {
      country: 'PK',
      format: '+.. ... .......'
    },
    '+48': {
      country: 'PL',
      format: '+.. .. ... .. ..'
    },
    '+508': {
      country: 'PM',
      format: '+... .. .. ..'
    },
    '+872': {
      country: 'PN'
    },
    '+1939': {
      country: 'PR'
    },
    '+970': {
      country: 'PS',
      format: '+... ... ... ...'
    },
    '+351': {
      country: 'PT',
      format: '+... ... ... ...'
    },
    '+680': {
      country: 'PW',
      format: '+... ... ....'
    },
    '+595': {
      country: 'PY',
      format: '+... .. .......'
    },
    '+974': {
      country: 'QA',
      format: '+... .... ....'
    },
    '+262': {
      country: 'RE'
    },
    '+40': {
      country: 'RO',
      format: '+.. .. ... ....'
    },
    '+381': {
      country: 'RS',
      format: '+... .. .......'
    },
    '+7': {
      country: 'RU',
      format: '+. ... ...-..-..'
    },
    '+250': {
      country: 'RW',
      format: '+... ... ... ...'
    },
    '+966': {
      country: 'SA',
      format: '+... .. ... ....'
    },
    '+677': {
      country: 'SB',
      format: '+... ... ....'
    },
    '+248': {
      country: 'SC',
      format: '+... . ... ...'
    },
    '+249': {
      country: 'SD',
      format: '+... .. ... ....'
    },
    '+46': {
      country: 'SE',
      format: '+.. ..-... .. ..'
    },
    '+65': {
      country: 'SG',
      format: '+.. .... ....'
    },
    '+290': {
      country: 'SH'
    },
    '+386': {
      country: 'SI',
      format: '+... .. ... ...'
    },
    '+421': {
      country: 'SK',
      format: '+... ... ... ...'
    },
    '+232': {
      country: 'SL',
      format: '+... .. ......'
    },
    '+378': {
      country: 'SM',
      format: '+... .. .. .. ..'
    },
    '+221': {
      country: 'SN',
      format: '+... .. ... .. ..'
    },
    '+252': {
      country: 'SO',
      format: '+... .. .......'
    },
    '+597': {
      country: 'SR',
      format: '+... ...-....'
    },
    '+211': {
      country: 'SS',
      format: '+... ... ... ...'
    },
    '+239': {
      country: 'ST',
      format: '+... ... ....'
    },
    '+503': {
      country: 'SV',
      format: '+... .... ....'
    },
    '+963': {
      country: 'SY',
      format: '+... ... ... ...'
    },
    '+268': {
      country: 'SZ',
      format: '+... .... ....'
    },
    '+1649': {
      country: 'TC'
    },
    '+235': {
      country: 'TD',
      format: '+... .. .. .. ..'
    },
    '+228': {
      country: 'TG',
      format: '+... .. .. .. ..'
    },
    '+66': {
      country: 'TH',
      format: '+.. .. ... ....'
    },
    '+992': {
      country: 'TJ',
      format: '+... ... .. ....'
    },
    '+690': {
      country: 'TK'
    },
    '+670': {
      country: 'TL',
      format: '+... .... ....'
    },
    '+993': {
      country: 'TM',
      format: '+... .. ..-..-..'
    },
    '+216': {
      country: 'TN',
      format: '+... .. ... ...'
    },
    '+676': {
      country: 'TO',
      format: '+... ... ....'
    },
    '+90': {
      country: 'TR',
      format: '+.. ... ... ....'
    },
    '+1868': {
      country: 'TT'
    },
    '+688': {
      country: 'TV'
    },
    '+886': {
      country: 'TW',
      format: '+... ... ... ...'
    },
    '+255': {
      country: 'TZ',
      format: '+... ... ... ...'
    },
    '+380': {
      country: 'UA',
      format: '+... .. ... ....'
    },
    '+256': {
      country: 'UG',
      format: '+... ... ......'
    },
    '+1': {
      country: 'US'
    },
    '+598': {
      country: 'UY',
      format: '+... .... ....'
    },
    '+998': {
      country: 'UZ',
      format: '+... .. ... .. ..'
    },
    '+379': {
      country: 'VA'
    },
    '+1784': {
      country: 'VC'
    },
    '+58': {
      country: 'VE',
      format: '+.. ...-.......'
    },
    '+1284': {
      country: 'VG'
    },
    '+1340': {
      country: 'VI'
    },
    '+84': {
      country: 'VN',
      format: '+.. .. ... .. ..'
    },
    '+678': {
      country: 'VU',
      format: '+... ... ....'
    },
    '+681': {
      country: 'WF',
      format: '+... .. .. ..'
    },
    '+685': {
      country: 'WS'
    },
    '+967': {
      country: 'YE',
      format: '+... ... ... ...'
    },
    '+27': {
      country: 'ZA',
      format: '+.. .. ... ....'
    },
    '+260': {
      country: 'ZM',
      format: '+... .. .......'
    },
    '+263': {
      country: 'ZW',
      format: '+... .. ... ....'
    }
  };

  (function(formats) {
    var canadaPrefixes, format, prefix, _i, _len, _results;
    canadaPrefixes = [403, 587, 780, 250, 604, 778, 204, 506, 709, 902, 226, 249, 289, 343, 416, 519, 613, 647, 705, 807, 905, 418, 438, 450, 514, 579, 581, 819, 873, 306, 867];
    for (_i = 0, _len = canadaPrefixes.length; _i < _len; _i++) {
      prefix = canadaPrefixes[_i];
      formats['+1' + prefix] = {
        country: 'CA'
      };
    }
    _results = [];
    for (prefix in formats) {
      format = formats[prefix];
      if (prefix.substring(0, 2) === "+1") {
        _results.push(format.format = '+. (...) ...-....');
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  })(formats);

}).call(this);

/*!
 Based on ndef.parser, by Raphael Graf(r@undefined.ch)
 http://www.undefined.ch/mparser/index.html

 Ported to JavaScript and modified by Matthew Crumley (email@matthewcrumley.com, http://silentmatt.com/)

 You are free to use and modify this code in anyway you find useful. Please leave this comment in the code
 to acknowledge its original source. If you feel like it, I enjoy hearing about projects that use my code,
 but don't feel like you have to let me know or ask permission.
*/

//  Added by stlsmiths 6/13/2011
//  re-define Array.indexOf, because IE doesn't know it ...
//
//  from http://stellapower.net/content/javascript-support-and-arrayindexof-ie
	if (!Array.indexOf) {
		Array.prototype.indexOf = function (obj, start) {
			for (var i = (start || 0); i < this.length; i++) {
				if (this[i] === obj) {
					return i;
				}
			}
			return -1;
		}
	}

var Parser = (function (scope) {
	function object(o) {
		function F() {}
		F.prototype = o;
		return new F();
	}

	var TNUMBER = 0;
	var TOP1 = 1;
	var TOP2 = 2;
	var TVAR = 3;
	var TFUNCALL = 4;

	function Token(type_, index_, prio_, number_) {
		this.type_ = type_;
		this.index_ = index_ || 0;
		this.prio_ = prio_ || 0;
		this.number_ = (number_ !== undefined && number_ !== null) ? number_ : 0;
		this.toString = function () {
			switch (this.type_) {
			case TNUMBER:
				return this.number_;
			case TOP1:
			case TOP2:
			case TVAR:
				return this.index_;
			case TFUNCALL:
				return "CALL";
			default:
				return "Invalid Token";
			}
		};
	}

	function Expression(tokens, ops1, ops2, functions) {
		this.tokens = tokens;
		this.ops1 = ops1;
		this.ops2 = ops2;
		this.functions = functions;
	}

	// Based on http://www.json.org/json2.js
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\'\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            "'" : "\\'",
            '\\': '\\\\'
        };

	function escapeValue(v) {
		if (typeof v === "string") {
			escapable.lastIndex = 0;
	        return escapable.test(v) ?
	            "'" + v.replace(escapable, function (a) {
	                var c = meta[a];
	                return typeof c === 'string' ? c :
	                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
	            }) + "'" :
	            "'" + v + "'";
		}
		return v;
	}

	Expression.prototype = {
		simplify: function (values) {
			values = values || {};
			var nstack = [];
			var newexpression = [];
			var n1;
			var n2;
			var f;
			var L = this.tokens.length;
			var item;
			var i = 0;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(item);
				}
				else if (type_ === TVAR && (item.index_ in values)) {
					item = new Token(TNUMBER, 0, 0, values[item.index_]);
					nstack.push(item);
				}
				else if (type_ === TOP2 && nstack.length > 1) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = this.ops2[item.index_];
					item = new Token(TNUMBER, 0, 0, f(n1.number_, n2.number_));
					nstack.push(item);
				}
				else if (type_ === TOP1 && nstack.length > 0) {
					n1 = nstack.pop();
					f = this.ops1[item.index_];
					item = new Token(TNUMBER, 0, 0, f(n1.number_));
					nstack.push(item);
				}
				else {
					while (nstack.length > 0) {
						newexpression.push(nstack.shift());
					}
					newexpression.push(item);
				}
			}
			while (nstack.length > 0) {
				newexpression.push(nstack.shift());
			}

			return new Expression(newexpression, object(this.ops1), object(this.ops2), object(this.functions));
		},

		substitute: function (variable, expr) {
			if (!(expr instanceof Expression)) {
				expr = new Parser().parse(String(expr));
			}
			var newexpression = [];
			var L = this.tokens.length;
			var item;
			var i = 0;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TVAR && item.index_ === variable) {
					for (var j = 0; j < expr.tokens.length; j++) {
						var expritem = expr.tokens[j];
						var replitem = new Token(expritem.type_, expritem.index_, expritem.prio_, expritem.number_);
						newexpression.push(replitem);
					}
				}
				else {
					newexpression.push(item);
				}
			}

			var ret = new Expression(newexpression, object(this.ops1), object(this.ops2), object(this.functions));
			return ret;
		},

		evaluate: function (values) {
			values = values || {};
			var nstack = [];
			var n1;
			var n2;
			var f;
			var L = this.tokens.length;
			var item;
			var i = 0;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(item.number_);
				}
				else if (type_ === TOP2) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = this.ops2[item.index_];
					nstack.push(f(n1, n2));
				}
				else if (type_ === TVAR) {
					if (item.index_ in values) {
						nstack.push(values[item.index_]);
					}
					else if (item.index_ in this.functions) {
						nstack.push(this.functions[item.index_]);
					}
					else {
						throw new Error("undefined variable: " + item.index_);
					}
				}
				else if (type_ === TOP1) {
					n1 = nstack.pop();
					f = this.ops1[item.index_];
					nstack.push(f(n1));
				}
				else if (type_ === TFUNCALL) {
					n1 = nstack.pop();
					f = nstack.pop();
					if (f.apply && f.call) {
						if (Object.prototype.toString.call(n1) == "[object Array]") {
							nstack.push(f.apply(undefined, n1));
						}
						else {
							nstack.push(f.call(undefined, n1));
						}
					}
					else {
						throw new Error(f + " is not a function");
					}
				}
				else {
					throw new Error("invalid Expression");
				}
			}
			if (nstack.length > 1) {
				throw new Error("invalid Expression (parity)");
			}
			return nstack[0];
		},

		toString: function (toJS) {
			var nstack = [];
			var n1;
			var n2;
			var f;
			var L = this.tokens.length;
			var item;
			var i = 0;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(escapeValue(item.number_));
				}
				else if (type_ === TOP2) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = item.index_;
					if (toJS && f == "^") {
						nstack.push("Math.pow(" + n1 + "," + n2 + ")");
					}
					else {
						nstack.push("(" + n1 + f + n2 + ")");
					}
				}
				else if (type_ === TVAR) {
					nstack.push(item.index_);
				}
				else if (type_ === TOP1) {
					n1 = nstack.pop();
					f = item.index_;
					if (f === "-") {
						nstack.push("(" + f + n1 + ")");
					}
					else {
						nstack.push(f + "(" + n1 + ")");
					}
				}
				else if (type_ === TFUNCALL) {
					n1 = nstack.pop();
					f = nstack.pop();
					nstack.push(f + "(" + n1 + ")");
				}
				else {
					throw new Error("invalid Expression");
				}
			}
			if (nstack.length > 1) {
				throw new Error("invalid Expression (parity)");
			}
			return nstack[0];
		},

		variables: function () {
			var L = this.tokens.length;
			var vars = [];
			for (var i = 0; i < L; i++) {
				var item = this.tokens[i];
				if (item.type_ === TVAR && (vars.indexOf(item.index_) == -1)) {
					vars.push(item.index_);
				}
			}

			return vars;
		},

		toJSFunction: function (param, variables) {
			var f = new Function(param, "with(Parser.values) { return " + this.simplify(variables).toString(true) + "; }");
			return f;
		}
	};

	function add(a, b) {
		return Number(a) + Number(b);
	}
	function sub(a, b) {
		return a - b; 
	}
	function mul(a, b) {
		return a * b;
	}
	function div(a, b) {
		return a / b;
	}
	function mod(a, b) {
		return a % b;
	}
	function concat(a, b) {
		return "" + a + b;
	}

	function log10(a) {
	      return Math.log(a) * Math.LOG10E;
	}
	function neg(a) {
		return -a;
	}

	function random(a) {
		return Math.random() * (a || 1);
	}
	function fac(a) { //a!
		a = Math.floor(a);
		var b = a;
		while (a > 1) {
			b = b * (--a);
		}
		return b;
	}

	// TODO: use hypot that doesn't overflow
	function pyt(a, b) {
		return Math.sqrt(a * a + b * b);
	}

	function append(a, b) {
		if (Object.prototype.toString.call(a) != "[object Array]") {
			return [a, b];
		}
		a = a.slice();
		a.push(b);
		return a;
	}

	function Parser() {
		this.success = false;
		this.errormsg = "";
		this.expression = "";

		this.pos = 0;

		this.tokennumber = 0;
		this.tokenprio = 0;
		this.tokenindex = 0;
		this.tmpprio = 0;

		this.ops1 = {
			"sin": Math.sin,
			"cos": Math.cos,
			"tan": Math.tan,
			"asin": Math.asin,
			"acos": Math.acos,
			"atan": Math.atan,
			"sqrt": Math.sqrt,
			"log": Math.log,
			"lg" : log10,
			"log10" : log10,
			"abs": Math.abs,
			"ceil": Math.ceil,
			"floor": Math.floor,
			"round": Math.round,
			"-": neg,
			"exp": Math.exp
		};

		this.ops2 = {
			"+": add,
			"-": sub,
			"*": mul,
			"/": div,
			"%": mod,
			"^": Math.pow,
			",": append,
			"||": concat
		};

		this.functions = {
			"random": random,
			"fac": fac,
			"min": Math.min,
			"max": Math.max,
			"pyt": pyt,
			"pow": Math.pow,
			"atan2": Math.atan2
		};

		this.consts = {
			"E": Math.E,
			"PI": Math.PI
		};
	}

	Parser.parse = function (expr) {
		return new Parser().parse(expr);
	};

	Parser.evaluate = function (expr, variables) {
		return Parser.parse(expr).evaluate(variables);
	};

	Parser.Expression = Expression;

	Parser.values = {
		sin: Math.sin,
		cos: Math.cos,
		tan: Math.tan,
		asin: Math.asin,
		acos: Math.acos,
		atan: Math.atan,
		sqrt: Math.sqrt,
		log: Math.log,
		lg: log10,
		log10: log10,
		abs: Math.abs,
		ceil: Math.ceil,
		floor: Math.floor,
		round: Math.round,
		random: random,
		fac: fac,
		exp: Math.exp,
		min: Math.min,
		max: Math.max,
		pyt: pyt,
		pow: Math.pow,
		atan2: Math.atan2,
		E: Math.E,
		PI: Math.PI
	};

	var PRIMARY      = 1 << 0;
	var OPERATOR     = 1 << 1;
	var FUNCTION     = 1 << 2;
	var LPAREN       = 1 << 3;
	var RPAREN       = 1 << 4;
	var COMMA        = 1 << 5;
	var SIGN         = 1 << 6;
	var CALL         = 1 << 7;
	var NULLARY_CALL = 1 << 8;

	Parser.prototype = {
		parse: function (expr) {
			this.errormsg = "";
			this.success = true;
			var operstack = [];
			var tokenstack = [];
			this.tmpprio = 0;
			var expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
			var noperators = 0;
			this.expression = expr;
			this.pos = 0;

			while (this.pos < this.expression.length) {
				if (this.isOperator()) {
					if (this.isSign() && (expected & SIGN)) {
						if (this.isNegativeSign()) {
							this.tokenprio = 2;
							this.tokenindex = "-";
							noperators++;
							this.addfunc(tokenstack, operstack, TOP1);
						}
						expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
					}
					else if (this.isComment()) {

					}
					else {
						if ((expected & OPERATOR) === 0) {
							this.error_parsing(this.pos, "unexpected operator");
						}
						noperators += 2;
						this.addfunc(tokenstack, operstack, TOP2);
						expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
					}
				}
				else if (this.isNumber()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected number");
					}
					var token = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(token);

					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isString()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected string");
					}
					var token = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(token);

					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isLeftParenth()) {
					if ((expected & LPAREN) === 0) {
						this.error_parsing(this.pos, "unexpected \"(\"");
					}

					if (expected & CALL) {
						noperators += 2;
						this.tokenprio = -2;
						this.tokenindex = -1;
						this.addfunc(tokenstack, operstack, TFUNCALL);
					}

					expected = (PRIMARY | LPAREN | FUNCTION | SIGN | NULLARY_CALL);
				}
				else if (this.isRightParenth()) {
				    if (expected & NULLARY_CALL) {
						var token = new Token(TNUMBER, 0, 0, []);
						tokenstack.push(token);
					}
					else if ((expected & RPAREN) === 0) {
						this.error_parsing(this.pos, "unexpected \")\"");
					}

					expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
				}
				else if (this.isComma()) {
					if ((expected & COMMA) === 0) {
						this.error_parsing(this.pos, "unexpected \",\"");
					}
					this.addfunc(tokenstack, operstack, TOP2);
					noperators += 2;
					expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
				}
				else if (this.isConst()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected constant");
					}
					var consttoken = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(consttoken);
					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isOp2()) {
					if ((expected & FUNCTION) === 0) {
						this.error_parsing(this.pos, "unexpected function");
					}
					this.addfunc(tokenstack, operstack, TOP2);
					noperators += 2;
					expected = (LPAREN);
				}
				else if (this.isOp1()) {
					if ((expected & FUNCTION) === 0) {
						this.error_parsing(this.pos, "unexpected function");
					}
					this.addfunc(tokenstack, operstack, TOP1);
					noperators++;
					expected = (LPAREN);
				}
				else if (this.isVar()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected variable");
					}
					var vartoken = new Token(TVAR, this.tokenindex, 0, 0);
					tokenstack.push(vartoken);

					expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
				}
				else if (this.isWhite()) {
				}
				else {
					if (this.errormsg === "") {
						this.error_parsing(this.pos, "unknown character");
					}
					else {
						this.error_parsing(this.pos, this.errormsg);
					}
				}
			}
			if (this.tmpprio < 0 || this.tmpprio >= 10) {
				this.error_parsing(this.pos, "unmatched \"()\"");
			}
			while (operstack.length > 0) {
				var tmp = operstack.pop();
				tokenstack.push(tmp);
			}
			if (noperators + 1 !== tokenstack.length) {
				//print(noperators + 1);
				//print(tokenstack);
				this.error_parsing(this.pos, "parity");
			}

			return new Expression(tokenstack, object(this.ops1), object(this.ops2), object(this.functions));
		},

		evaluate: function (expr, variables) {
			return this.parse(expr).evaluate(variables);
		},

		error_parsing: function (column, msg) {
			this.success = false;
			this.errormsg = "parse error [column " + (column) + "]: " + msg;
			throw new Error(this.errormsg);
		},

//\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

		addfunc: function (tokenstack, operstack, type_) {
			var operator = new Token(type_, this.tokenindex, this.tokenprio + this.tmpprio, 0);
			while (operstack.length > 0) {
				if (operator.prio_ <= operstack[operstack.length - 1].prio_) {
					tokenstack.push(operstack.pop());
				}
				else {
					break;
				}
			}
			operstack.push(operator);
		},

		isNumber: function () {
			var r = false;
			var str = "";
			while (this.pos < this.expression.length) {
				var code = this.expression.charCodeAt(this.pos);
				if ((code >= 48 && code <= 57) || code === 46) {
					str += this.expression.charAt(this.pos);
					this.pos++;
					this.tokennumber = parseFloat(str);
					r = true;
				}
				else {
					break;
				}
			}
			return r;
		},

		// Ported from the yajjl JSON parser at http://code.google.com/p/yajjl/
		unescape: function(v, pos) {
			var buffer = [];
			var escaping = false;

			for (var i = 0; i < v.length; i++) {
				var c = v.charAt(i);
	
				if (escaping) {
					switch (c) {
					case "'":
						buffer.push("'");
						break;
					case '\\':
						buffer.push('\\');
						break;
					case '/':
						buffer.push('/');
						break;
					case 'b':
						buffer.push('\b');
						break;
					case 'f':
						buffer.push('\f');
						break;
					case 'n':
						buffer.push('\n');
						break;
					case 'r':
						buffer.push('\r');
						break;
					case 't':
						buffer.push('\t');
						break;
					case 'u':
						// interpret the following 4 characters as the hex of the unicode code point
						var codePoint = parseInt(v.substring(i + 1, i + 5), 16);
						buffer.push(String.fromCharCode(codePoint));
						i += 4;
						break;
					default:
						throw this.error_parsing(pos + i, "Illegal escape sequence: '\\" + c + "'");
					}
					escaping = false;
				} else {
					if (c == '\\') {
						escaping = true;
					} else {
						buffer.push(c);
					}
				}
			}
	
			return buffer.join('');
		},

		isString: function () {
			var r = false;
			var str = "";
			var startpos = this.pos;
			if (this.pos < this.expression.length && this.expression.charAt(this.pos) == "'") {
				this.pos++;
				while (this.pos < this.expression.length) {
					var code = this.expression.charAt(this.pos);
					if (code != "'" || str.slice(-1) == "\\") {
						str += this.expression.charAt(this.pos);
						this.pos++;
					}
					else {
						this.pos++;
						this.tokennumber = this.unescape(str, startpos);
						r = true;
						break;
					}
				}
			}
			return r;
		},

		isConst: function () {
			var str;
			for (var i in this.consts) {
				if (true) {
					var L = i.length;
					str = this.expression.substr(this.pos, L);
					if (i === str) {
						this.tokennumber = this.consts[i];
						this.pos += L;
						return true;
					}
				}
			}
			return false;
		},

		isOperator: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 43) { // +
				this.tokenprio = 0;
				this.tokenindex = "+";
			}
			else if (code === 45) { // -
				this.tokenprio = 0;
				this.tokenindex = "-";
			}
			else if (code === 124) { // |
				if (this.expression.charCodeAt(this.pos + 1) === 124) {
					this.pos++;
					this.tokenprio = 0;
					this.tokenindex = "||";
				}
				else {
					return false;
				}
			}
			else if (code === 42 || code === 8729 || code === 8226) { // * or ∙ or •
				this.tokenprio = 1;
				this.tokenindex = "*";
			}
			else if (code === 47) { // /
				this.tokenprio = 2;
				this.tokenindex = "/";
			}
			else if (code === 37) { // %
				this.tokenprio = 2;
				this.tokenindex = "%";
			}
			else if (code === 94) { // ^
				this.tokenprio = 3;
				this.tokenindex = "^";
			}
			else {
				return false;
			}
			this.pos++;
			return true;
		},

		isSign: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 45 || code === 43) { // -
				return true;
			}
			return false;
		},

		isPositiveSign: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 43) { // +
				return true;
			}
			return false;
		},

		isNegativeSign: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 45) { // -
				return true;
			}
			return false;
		},

		isLeftParenth: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 40) { // (
				this.pos++;
				this.tmpprio += 10;
				return true;
			}
			return false;
		},

		isRightParenth: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 41) { // )
				this.pos++;
				this.tmpprio -= 10;
				return true;
			}
			return false;
		},

		isComma: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 44) { // ,
				this.pos++;
				this.tokenprio = -1;
				this.tokenindex = ",";
				return true;
			}
			return false;
		},

		isWhite: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 32 || code === 9 || code === 10 || code === 13) {
				this.pos++;
				return true;
			}
			return false;
		},

		isOp1: function () {
			var str = "";
			for (var i = this.pos; i < this.expression.length; i++) {
				var c = this.expression.charAt(i);
				if (c.toUpperCase() === c.toLowerCase()) {
					if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
						break;
					}
				}
				str += c;
			}
			if (str.length > 0 && (str in this.ops1)) {
				this.tokenindex = str;
				this.tokenprio = 5;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isOp2: function () {
			var str = "";
			for (var i = this.pos; i < this.expression.length; i++) {
				var c = this.expression.charAt(i);
				if (c.toUpperCase() === c.toLowerCase()) {
					if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
						break;
					}
				}
				str += c;
			}
			if (str.length > 0 && (str in this.ops2)) {
				this.tokenindex = str;
				this.tokenprio = 5;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isVar: function () {
			var str = "";
			for (var i = this.pos; i < this.expression.length; i++) {
				var c = this.expression.charAt(i);
				if (c.toUpperCase() === c.toLowerCase()) {
					if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
						break;
					}
				}
				str += c;
			}
			if (str.length > 0) {
				this.tokenindex = str;
				this.tokenprio = 4;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isComment: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 47 && this.expression.charCodeAt(this.pos) === 42) {
				this.pos = this.expression.indexOf("*/", this.pos) + 2;
				if (this.pos === 1) {
					this.pos = this.expression.length;
				}
				return true;
			}
			return false;
		}
	};

	scope.Parser = Parser;
	return Parser
})(typeof exports === 'undefined' ? {} : exports);

var doc = document,body = $(doc.body),win = window;
win.bcpie = {
	active: {
		bcpieSDK: '2015.01.31',
		tricks: {} // populated automatically
	},
	globals: {
		path: win.location.pathname.toLowerCase(),
		pathArray: win.location.pathname.toLowerCase().split(/(?=\/#?[a-zA-Z0-9])/g),
		param: win.location.search,
		paramArray: win.location.search.split(/(?=&#?[a-zA-Z0-9])/g),
		hash: win.location.hash,
		countries: {"AF": {"Country": "Afghanistan", "ContinentCode": "AS", "Continent": "Asia"}, "AX": {"Country": "Aland Islands", "ContinentCode": "EU", "Continent": "Europe"}, "AL": {"Country": "Albania", "ContinentCode": "EU", "Continent": "Europe"}, "DZ": {"Country": "Algeria", "ContinentCode": "AF", "Continent": "Africa"}, "AS": {"Country": "American Samoa", "ContinentCode": "OC", "Continent": "Oceania"}, "AD": {"Country": "Andorra", "ContinentCode": "EU", "Continent": "Europe"}, "AO": {"Country": "Angola", "ContinentCode": "AF", "Continent": "Africa"}, "AI": {"Country": "Anguilla", "ContinentCode": "NA", "Continent": "North America"}, "AQ": {"Country": "Antarctica", "ContinentCode": "AN", "Continent": "Antartica"}, "AG": {"Country": "Antigua and Barbuda", "ContinentCode": "NA", "Continent": "North America"}, "AR": {"Country": "Argentina", "ContinentCode": "SA", "Continent": "South America"}, "AM": {"Country": "Armenia", "ContinentCode": "AS", "Continent": "Asia"}, "AW": {"Country": "Aruba", "ContinentCode": "NA", "Continent": "North America"}, "AU": {"Country": "Australia", "ContinentCode": "OC", "Continent": "Oceania"}, "AT": {"Country": "Austria", "ContinentCode": "EU", "Continent": "Europe"}, "AZ": {"Country": "Azerbaijan", "ContinentCode": "AS", "Continent": "Asia"}, "BS": {"Country": "Bahamas", "ContinentCode": "NA", "Continent": "North America"}, "BH": {"Country": "Bahrain", "ContinentCode": "AS", "Continent": "Asia"}, "BD": {"Country": "Bangladesh", "ContinentCode": "AS", "Continent": "Asia"}, "BB": {"Country": "Barbados", "ContinentCode": "NA", "Continent": "North America"}, "BY": {"Country": "Belarus", "ContinentCode": "EU", "Continent": "Europe"}, "BE": {"Country": "Belgium", "ContinentCode": "EU", "Continent": "Europe"}, "BZ": {"Country": "Belize", "ContinentCode": "NA", "Continent": "North America"}, "BJ": {"Country": "Benin", "ContinentCode": "AF", "Continent": "Africa"}, "BM": {"Country": "Bermuda", "ContinentCode": "NA", "Continent": "North America"}, "BT": {"Country": "Bhutan", "ContinentCode": "AS", "Continent": "Asia"}, "BO": {"Country": "Bolivia", "ContinentCode": "SA", "Continent": "South America"}, "BA": {"Country": "Bosnia and Herzegovina", "ContinentCode": "EU", "Continent": "Europe"}, "BW": {"Country": "Botswana", "ContinentCode": "AF", "Continent": "Africa"}, "BV": {"Country": "Bouvet Island", "ContinentCode": "AN", "Continent": "Antartica"}, "BR": {"Country": "Brazil", "ContinentCode": "SA", "Continent": "South America"}, "IO": {"Country": "British Indian Ocean Territory", "ContinentCode": "AS", "Continent": "Asia"}, "VG": {"Country": "British Virgin Islands", "ContinentCode": "NA", "Continent": "North America"}, "BN": {"Country": "Brunei Darussalam", "ContinentCode": "AS", "Continent": "Asia"}, "BG": {"Country": "Bulgaria", "ContinentCode": "EU", "Continent": "Europe"}, "BF": {"Country": "Burkina Faso", "ContinentCode": "AF", "Continent": "Africa"}, "BI": {"Country": "Burundi", "ContinentCode": "AF", "Continent": "Africa"}, "KH": {"Country": "Cambodia", "ContinentCode": "AS", "Continent": "Asia"}, "CM": {"Country": "Cameroon", "ContinentCode": "AF", "Continent": "Africa"}, "CA": {"Country": "Canada", "ContinentCode": "NA", "Continent": "North America"}, "CV": {"Country": "Cape Verde", "ContinentCode": "AF", "Continent": "Africa"}, "KY": {"Country": "Cayman Islands", "ContinentCode": "NA", "Continent": "North America"}, "CF": {"Country": "Central African Republic", "ContinentCode": "AF", "Continent": "Africa"}, "TD": {"Country": "Chad", "ContinentCode": "AF", "Continent": "Africa"}, "CL": {"Country": "Chile", "ContinentCode": "SA", "Continent": "South America"}, "CN": {"Country": "China", "ContinentCode": "AS", "Continent": "Asia"}, "CX": {"Country": "Christmas Island", "ContinentCode": "AS", "Continent": "Asia"}, "CC": {"Country": "Cocos (Keeling) Islands", "ContinentCode": "AS", "Continent": "Asia"}, "CO": {"Country": "Colombia", "ContinentCode": "SA", "Continent": "South America"}, "KM": {"Country": "Comoros", "ContinentCode": "AF", "Continent": "Africa"}, "CG": {"Country": "Congo", "ContinentCode": "AF", "Continent": "Africa"}, "CD": {"Country": "Congo, Democratic Republic of the", "ContinentCode": "AF", "Continent": "Africa"}, "CK": {"Country": "Cook Islands", "ContinentCode": "OC", "Continent": "Oceania"}, "CR": {"Country": "Costa Rica", "ContinentCode": "NA", "Continent": "North America"}, "HR": {"Country": "Croatia", "ContinentCode": "EU", "Continent": "Europe"}, "CY": {"Country": "Cyprus", "ContinentCode": "AS", "Continent": "Asia"}, "CZ": {"Country": "Czech Republic", "ContinentCode": "EU", "Continent": "Europe"}, "DK": {"Country": "Denmark", "ContinentCode": "EU", "Continent": "Europe"}, "DJ": {"Country": "Djibouti", "ContinentCode": "AF", "Continent": "Africa"}, "DM": {"Country": "Dominica", "ContinentCode": "NA", "Continent": "North America"}, "DO": {"Country": "Dominican Republic", "ContinentCode": "NA", "Continent": "North America"}, "TL": {"Country": "East Timor", "ContinentCode": "AS", "Continent": "Asia"}, "EC": {"Country": "Ecuador", "ContinentCode": "SA", "Continent": "South America"}, "EG": {"Country": "Egypt", "ContinentCode": "AF", "Continent": "Africa"}, "SV": {"Country": "El Salvador", "ContinentCode": "NA", "Continent": "North America"}, "GQ": {"Country": "Equatorial Guinea", "ContinentCode": "AF", "Continent": "Africa"}, "ER": {"Country": "Eritrea", "ContinentCode": "AF", "Continent": "Africa"}, "EE": {"Country": "Estonia", "ContinentCode": "EU", "Continent": "Europe"}, "ET": {"Country": "Ethiopia", "ContinentCode": "AF", "Continent": "Africa"}, "FK": {"Country": "Falkland Islands", "ContinentCode": "SA", "Continent": "South America"}, "FO": {"Country": "Faroe Islands", "ContinentCode": "EU", "Continent": "Europe"}, "FJ": {"Country": "Fiji", "ContinentCode": "OC", "Continent": "Oceania"}, "FI": {"Country": "Finland", "ContinentCode": "EU", "Continent": "Europe"}, "FR": {"Country": "France", "ContinentCode": "EU", "Continent": "Europe"}, "GF": {"Country": "French Guiana", "ContinentCode": "SA", "Continent": "South America"}, "PF": {"Country": "French Polynesia", "ContinentCode": "OC", "Continent": "Oceania"}, "TF": {"Country": "French Southern Territories", "ContinentCode": "AN", "Continent": "Antartica"}, "GA": {"Country": "Gabon", "ContinentCode": "AF", "Continent": "Africa"}, "GM": {"Country": "Gambia", "ContinentCode": "AF", "Continent": "Africa"}, "GE": {"Country": "Georgia", "ContinentCode": "AS", "Continent": "Asia"}, "DE": {"Country": "Germany", "ContinentCode": "EU", "Continent": "Europe"}, "GH": {"Country": "Ghana", "ContinentCode": "AF", "Continent": "Africa"}, "GI": {"Country": "Gibraltar", "ContinentCode": "EU", "Continent": "Europe"}, "GR": {"Country": "Greece", "ContinentCode": "EU", "Continent": "Europe"}, "GL": {"Country": "Greenland", "ContinentCode": "NA", "Continent": "North America"}, "GD": {"Country": "Grenada", "ContinentCode": "NA", "Continent": "North America"}, "GP": {"Country": "Guadeloupe", "ContinentCode": "NA", "Continent": "North America"}, "GU": {"Country": "Guam", "ContinentCode": "OC", "Continent": "Oceania"}, "GT": {"Country": "Guatemala", "ContinentCode": "NA", "Continent": "North America"}, "GG": {"Country": "Guernsey", "ContinentCode": "EU", "Continent": "Europe"}, "GN": {"Country": "Guinea", "ContinentCode": "AF", "Continent": "Africa"}, "GW": {"Country": "Guinea-Bissau", "ContinentCode": "AF", "Continent": "Africa"}, "GY": {"Country": "Guyana", "ContinentCode": "SA", "Continent": "South America"}, "HT": {"Country": "Haiti", "ContinentCode": "NA", "Continent": "North America"}, "HM": {"Country": "Heard Island and McDonald Islands", "ContinentCode": "AN", "Continent": "Antartica"}, "VA": {"Country": "Holy See (Vatican City-State)", "ContinentCode": "EU", "Continent": "Europe"}, "HN": {"Country": "Honduras", "ContinentCode": "NA", "Continent": "North America"}, "HK": {"Country": "Hong Kong SAR", "ContinentCode": "AS", "Continent": "Asia"}, "HU": {"Country": "Hungary", "ContinentCode": "EU", "Continent": "Europe"}, "IS": {"Country": "Iceland", "ContinentCode": "EU", "Continent": "Europe"}, "IN": {"Country": "India", "ContinentCode": "AS", "Continent": "Asia"}, "ID": {"Country": "Indonesia", "ContinentCode": "AS", "Continent": "Asia"}, "IQ": {"Country": "Iraq", "ContinentCode": "AS", "Continent": "Asia"}, "IE": {"Country": "Ireland", "ContinentCode": "EU", "Continent": "Europe"}, "IL": {"Country": "Israel", "ContinentCode": "AS", "Continent": "Asia"}, "IT": {"Country": "Italy", "ContinentCode": "EU", "Continent": "Europe"}, "CI": {"Country": "Ivory Coast", "ContinentCode": "AF", "Continent": "Africa"}, "JM": {"Country": "Jamaica", "ContinentCode": "NA", "Continent": "North America"}, "JP": {"Country": "Japan", "ContinentCode": "AS", "Continent": "Asia"}, "JE": {"Country": "Jersey", "ContinentCode": "EU", "Continent": "Europe"}, "JO": {"Country": "Jordan", "ContinentCode": "AS", "Continent": "Asia"}, "KZ": {"Country": "Kazakhstan", "ContinentCode": "AS", "Continent": "Asia"}, "KE": {"Country": "Kenya", "ContinentCode": "AF", "Continent": "Africa"}, "KI": {"Country": "Kiribati", "ContinentCode": "OC", "Continent": "Oceania"}, "KR": {"Country": "Korea, Republic Of", "ContinentCode": "AS", "Continent": "Asia"}, "KW": {"Country": "Kuwait", "ContinentCode": "AS", "Continent": "Asia"}, "KG": {"Country": "Kyrgyzstan", "ContinentCode": "AS", "Continent": "Asia"}, "LA": {"Country": "Laos", "ContinentCode": "AS", "Continent": "Asia"}, "LV": {"Country": "Latvia", "ContinentCode": "EU", "Continent": "Europe"}, "LB": {"Country": "Lebanon", "ContinentCode": "AS", "Continent": "Asia"}, "LS": {"Country": "Lesotho", "ContinentCode": "AF", "Continent": "Africa"}, "LR": {"Country": "Liberia", "ContinentCode": "AF", "Continent": "Africa"}, "LY": {"Country": "Libya", "ContinentCode": "AF", "Continent": "Africa"}, "LI": {"Country": "Liechtenstein", "ContinentCode": "EU", "Continent": "Europe"}, "LT": {"Country": "Lithuania", "ContinentCode": "EU", "Continent": "Europe"}, "LU": {"Country": "Luxembourg", "ContinentCode": "EU", "Continent": "Europe"}, "MO": {"Country": "Macao SAR", "ContinentCode": "AS", "Continent": "Asia"}, "MK": {"Country": "Macedonia, Former Yugoslav Republic of", "ContinentCode": "EU", "Continent": "Europe"}, "MG": {"Country": "Madagascar", "ContinentCode": "AF", "Continent": "Africa"}, "MW": {"Country": "Malawi", "ContinentCode": "AF", "Continent": "Africa"}, "MY": {"Country": "Malaysia", "ContinentCode": "AS", "Continent": "Asia"}, "MV": {"Country": "Maldives", "ContinentCode": "AS", "Continent": "Asia"}, "ML": {"Country": "Mali", "ContinentCode": "AF", "Continent": "Africa"}, "MT": {"Country": "Malta", "ContinentCode": "EU", "Continent": "Europe"}, "MH": {"Country": "Marshall Islands", "ContinentCode": "OC", "Continent": "Oceania"}, "MQ": {"Country": "Martinique", "ContinentCode": "NA", "Continent": "North America"}, "MR": {"Country": "Mauritania", "ContinentCode": "AF", "Continent": "Africa"}, "MU": {"Country": "Mauritius", "ContinentCode": "AF", "Continent": "Africa"}, "YT": {"Country": "Mayotte", "ContinentCode": "AF", "Continent": "Africa"}, "MX": {"Country": "Mexico", "ContinentCode": "NA", "Continent": "North America"}, "FM": {"Country": "Micronesia, Federated States of", "ContinentCode": "OC", "Continent": "Oceania"}, "MD": {"Country": "Moldova", "ContinentCode": "EU", "Continent": "Europe"}, "MC": {"Country": "Monaco", "ContinentCode": "EU", "Continent": "Europe"}, "MN": {"Country": "Mongolia", "ContinentCode": "AS", "Continent": "Asia"}, "ME": {"Country": "Montenegro", "ContinentCode": "EU", "Continent": "Europe"}, "MS": {"Country": "Montserrat", "ContinentCode": "NA", "Continent": "North America"}, "MA": {"Country": "Morocco", "ContinentCode": "AF", "Continent": "Africa"}, "MZ": {"Country": "Mozambique", "ContinentCode": "AF", "Continent": "Africa"}, "MM": {"Country": "Myanmar", "ContinentCode": "AS", "Continent": "Asia"}, "NA": {"Country": "Namibia", "ContinentCode": "AF", "Continent": "Africa"}, "NR": {"Country": "Nauru", "ContinentCode": "OC", "Continent": "Oceania"}, "NP": {"Country": "Nepal", "ContinentCode": "AS", "Continent": "Asia"}, "NL": {"Country": "Netherlands", "ContinentCode": "EU", "Continent": "Europe"}, "AN": {"Country": "Netherlands Antilles", "ContinentCode": "NA", "Continent": "North America"}, "NC": {"Country": "New Caledonia", "ContinentCode": "OC", "Continent": "Oceania"}, "NZ": {"Country": "New Zealand", "ContinentCode": "OC", "Continent": "Oceania"}, "NI": {"Country": "Nicaragua", "ContinentCode": "NA", "Continent": "North America"}, "NE": {"Country": "Niger", "ContinentCode": "AF", "Continent": "Africa"}, "NG": {"Country": "Nigeria", "ContinentCode": "AF", "Continent": "Africa"}, "NU": {"Country": "Niue", "ContinentCode": "OC", "Continent": "Oceania"}, "NF": {"Country": "Norfolk Island", "ContinentCode": "OC", "Continent": "Oceania"}, "MP": {"Country": "Northern Mariana Islands", "ContinentCode": "OC", "Continent": "Oceania"}, "NO": {"Country": "Norway", "ContinentCode": "EU", "Continent": "Europe"}, "OM": {"Country": "Oman", "ContinentCode": "AS", "Continent": "Asia"}, "PK": {"Country": "Pakistan", "ContinentCode": "AS", "Continent": "Asia"}, "PW": {"Country": "Palau", "ContinentCode": "OC", "Continent": "Oceania"}, "PS": {"Country": "Palestine", "ContinentCode": "AS", "Continent": "Asia"}, "PA": {"Country": "Panama", "ContinentCode": "NA", "Continent": "North America"}, "PG": {"Country": "Papua New Guinea", "ContinentCode": "OC", "Continent": "Oceania"}, "PY": {"Country": "Paraguay", "ContinentCode": "SA", "Continent": "South America"}, "PE": {"Country": "Peru", "ContinentCode": "SA", "Continent": "South America"}, "PH": {"Country": "Philippines", "ContinentCode": "AS", "Continent": "Asia"}, "PN": {"Country": "Pitcairn Islands", "ContinentCode": "OC", "Continent": "Oceania"}, "PL": {"Country": "Poland", "ContinentCode": "EU", "Continent": "Europe"}, "PT": {"Country": "Portugal", "ContinentCode": "EU", "Continent": "Europe"}, "PR": {"Country": "Puerto Rico", "ContinentCode": "NA", "Continent": "North America"}, "QA": {"Country": "Qatar", "ContinentCode": "AS", "Continent": "Asia"}, "RE": {"Country": "Reunion", "ContinentCode": "AF", "Continent": "Africa"}, "RO": {"Country": "Romania", "ContinentCode": "EU", "Continent": "Europe"}, "RU": {"Country": "Russian Federation", "ContinentCode": "EU", "Continent": "Europe"}, "RW": {"Country": "Rwanda", "ContinentCode": "AF", "Continent": "Africa"}, "BL": {"Country": "Saint Barthélemy", "ContinentCode": "NA", "Continent": "North America"}, "WS": {"Country": "Samoa", "ContinentCode": "OC", "Continent": "Oceania"}, "SM": {"Country": "San Marino", "ContinentCode": "EU", "Continent": "Europe"}, "ST": {"Country": "Sao Tome and Principe", "ContinentCode": "AF", "Continent": "Africa"}, "SA": {"Country": "Saudi Arabia", "ContinentCode": "AS", "Continent": "Asia"}, "SN": {"Country": "Senegal", "ContinentCode": "AF", "Continent": "Africa"}, "RS": {"Country": "Serbia", "ContinentCode": "EU", "Continent": "Europe"}, "CS": {"Country": "Serbia and Montenegro", "ContinentCode": "EU", "Continent": "Europe"}, "SC": {"Country": "Seychelles", "ContinentCode": "AF", "Continent": "Africa"}, "SL": {"Country": "Sierra Leone", "ContinentCode": "AF", "Continent": "Africa"}, "SG": {"Country": "Singapore", "ContinentCode": "AS", "Continent": "Asia"}, "SK": {"Country": "Slovakia", "ContinentCode": "EU", "Continent": "Europe"}, "SI": {"Country": "Slovenia", "ContinentCode": "EU", "Continent": "Europe"}, "SB": {"Country": "Solomon Islands", "ContinentCode": "OC", "Continent": "Oceania"}, "SO": {"Country": "Somalia", "ContinentCode": "AF", "Continent": "Africa"}, "ZA": {"Country": "South Africa", "ContinentCode": "AF", "Continent": "Africa"}, "GS": {"Country": "South Georgia and the South Sandwich Islands", "ContinentCode": "AN", "Continent": "Antartica"}, "ES": {"Country": "Spain", "ContinentCode": "EU", "Continent": "Europe"}, "LK": {"Country": "Sri Lanka", "ContinentCode": "AS", "Continent": "Asia"}, "SH": {"Country": "St. Helena", "ContinentCode": "AF", "Continent": "Africa"}, "KN": {"Country": "St. Kitts and Nevis", "ContinentCode": "NA", "Continent": "North America"}, "LC": {"Country": "St. Lucia", "ContinentCode": "NA", "Continent": "North America"}, "MF": {"Country": "St. Martin", "ContinentCode": "NA", "Continent": "North America"}, "PM": {"Country": "St. Pierre and Miquelon", "ContinentCode": "NA", "Continent": "North America"}, "VC": {"Country": "St. Vincent and the Grenadines", "ContinentCode": "NA", "Continent": "North America"}, "SR": {"Country": "Suriname", "ContinentCode": "SA", "Continent": "South America"}, "SJ": {"Country": "Svalbard and Jan Mayen", "ContinentCode": "EU", "Continent": "Europe"}, "SZ": {"Country": "Swaziland", "ContinentCode": "AF", "Continent": "Africa"}, "SE": {"Country": "Sweden", "ContinentCode": "EU", "Continent": "Europe"}, "CH": {"Country": "Switzerland", "ContinentCode": "EU", "Continent": "Europe"}, "TW": {"Country": "Taiwan", "ContinentCode": "AS", "Continent": "Asia"}, "TJ": {"Country": "Tajikistan", "ContinentCode": "AS", "Continent": "Asia"}, "TZ": {"Country": "Tanzania", "ContinentCode": "AF", "Continent": "Africa"}, "TH": {"Country": "Thailand", "ContinentCode": "AS", "Continent": "Asia"}, "TG": {"Country": "Togo", "ContinentCode": "AF", "Continent": "Africa"}, "TK": {"Country": "Tokelau", "ContinentCode": "OC", "Continent": "Oceania"}, "TO": {"Country": "Tonga", "ContinentCode": "OC", "Continent": "Oceania"}, "TT": {"Country": "Trinidad and Tobago", "ContinentCode": "NA", "Continent": "North America"}, "TN": {"Country": "Tunisia", "ContinentCode": "AF", "Continent": "Africa"}, "TR": {"Country": "Turkey", "ContinentCode": "EU", "Continent": "Europe"}, "TM": {"Country": "Turkmenistan", "ContinentCode": "AS", "Continent": "Asia"}, "TC": {"Country": "Turks and Caicos Islands", "ContinentCode": "NA", "Continent": "North America"}, "TV": {"Country": "Tuvalu", "ContinentCode": "OC", "Continent": "Oceania"}, "UG": {"Country": "Uganda", "ContinentCode": "AF", "Continent": "Africa"}, "UA": {"Country": "Ukraine", "ContinentCode": "EU", "Continent": "Europe"}, "AE": {"Country": "United Arab Emirates", "ContinentCode": "AS", "Continent": "Asia"}, "GB": {"Country": "United Kingdom", "ContinentCode": "EU", "Continent": "Europe"}, "US": {"Country": "United States", "ContinentCode": "NA", "Continent": "North America"}, "UY": {"Country": "Uruguay", "ContinentCode": "SA", "Continent": "South America"}, "UM": {"Country": "US Minor Outlying Islands", "ContinentCode": "OC", "Continent": "Oceania"}, "VI": {"Country": "US Virgin Islands", "ContinentCode": "NA", "Continent": "North America"}, "UZ": {"Country": "Uzbekistan", "ContinentCode": "AS", "Continent": "Asia"}, "VU": {"Country": "Vanuatu", "ContinentCode": "OC", "Continent": "Oceania"}, "VE": {"Country": "Venezuela", "ContinentCode": "SA", "Continent": "South America"}, "VN": {"Country": "Viet Nam", "ContinentCode": "AS", "Continent": "Asia"}, "WF": {"Country": "Wallis and Futuna", "ContinentCode": "OC", "Continent": "Oceania"}, "EH": {"Country": "Western Sahara", "ContinentCode": "AF", "Continent": "Africa"}, "YE": {"Country": "Yemen", "ContinentCode": "AS", "Continent": "Asia"}, "ZM": {"Country": "Zambia", "ContinentCode": "AF", "Continent": "Africa"}, "ZW": {"Country": "Zimbabwe", "ContinentCode": "AF", "Continent": "Africa"} }
	},
	api: {
		token: function() {
			if (typeof $.cookie('access_token') !== 'undefined') return $.cookie('access_token');
			else return $.cookie('access_token',window.location.hash.replace('#access_token=',''));
		},
		data: {
			place: function(targets,data) {
				if (targets.length === 1 && targets.is('form')) targets = form.find('input,textarea,select,[data-name]').not('[data-noplace]');
				else targets = targets.not('[data-noplace]');
				if (typeof data === 'string') data = $.parseJSON(data);
				for (var key in data) {
					var value = data[key], unescapedValue = value;
					if(typeof value === 'string') unescapedValue = value.replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(n); });
					field = targets.filter('[name="'+key+'"]').not('[data-noplace]');
					element = targets.filter('[data-name="'+key+'"]').not('[data-noplace]');
					if (typeof element !== 'undefined') element.text(unescapedValue);
					if (typeof field !== 'undefined') {
						if (field.is('input[type=radio]')) {
							targets.filter('[name="'+key+'"]').filter(function(){
								return $(this).is('[value="'+unescapedValue+'"]');
							}).attr('checked','checked').prop('checked',true);
						}else if (field.is('input[type=checkbox]')) {
							unescapedValue = unescapedValue.split(',');
							for (var i=0; i<unescapedValue.length; i++) {
								targets.filter('[name="'+key+'"]').filter('[value="'+unescapedValue[i]+'"]').attr('checked','checked').prop('checked',true);
							}
						}else if (field.is('input[type=text],textarea')) field.val(unescapedValue);
					}
				}
			}
		},
		file : {
			get: function(path) {
				if (typeof path !== 'undefined' && path.length > 1) {
					if (path.charAt(0) === '/') path.slice(1, path.length - 1);
					if (path.charAt(path.length - 1) === '/') path.slice(0, - 1);
					return $.ajax({
						url: '/api/v2/admin/sites/current/storage/'+path,
						type: 'GET',
						connection: 'keep-alive',
						contentType: 'application/json',
						headers: {Authorization: bcpie.api.token()},
						async: false
					}).responseText;
				}else return 'no filename provided';
			},
			save: function(path,data) {
				if (path.charAt(0) === '/') path.slice(1, path.length - 1);
				if (path.charAt(path.length - 1) === '/') path.slice(0, - 1);
				return $.ajax({
					url: '/api/v2/admin/sites/current/storage/'+path+'?version=draft-publish',
					type: 'PUT',
					headers: {Authorization: bcpie.api.token()},
					contentType: 'application/octet-stream',
					async: false,
					data: data,
					processData: false
				});
			},
			delete: function(path){
				if (path.charAt(0) === '/') path.slice(1, path.length - 1);
				if (path.charAt(path.length - 1) === '/') path.slice(0, - 1);
				return $.ajax({
					url: '/api/v2/admin/sites/current/storage/'+path,
					type: "DELETE",
					headers: {Authorization: bcpie.api.token()}
				});
			}
		},
		webapp : {
			item: {
				get: function(webapp,item) {
					return $.ajax({
							url: '/api/v2/admin/sites/current/webapps/'+webapp+'/items/'+item,
							headers: {'Authorization': bcpie.api.token()},
							contentType: 'application/json',
							async: false
						}).responseJSON;
				},
				place: function(scope,webapp,item,callback) {
					var data = bcpie.api.webapp.item.get(webapp,item),field,element;
					bcpie.api.data.place(scope,data);
					bcpie.api.data.place(scope,data.fields);
					if(typeof callback !== 'undefined') callback(data);
				},
				save: function(selector,webapp,id) {
					var field, data, url = '/api/v2/admin/sites/current/webapps/'+webapp+'/items',
						type = 'POST', formData = selector.serializeObject();

					// Retrieve the custom fields list from the server
					$.ajax({
						url: '/api/v2/admin/sites/current/webapps/'+webapp+'/fields',
						type: 'get',
						async: false,
						contentType: 'application/json',
						headers: {'Authorization': bcpie.api.token()}
					}).done(function (msg) {
						data = {name:'', releaseDate:moment().subtract(12,'hour').format('YYYY-MM-DD'), expiryDate:'9999-01-01', enabled:true, country:'US', fields:{}};
						allFields = {name:'', weight:0, releaseDate:moment().subtract(12,'hour').format('YYYY-MM-DD'), expiryDate:'9999-01-01', enabled:true, slug:'', description:'', roleId:null, submittedBy:-1, templateId:-1, address:'', city:'', state:'', zipCode:'', country:'',fields:{}};

						if (typeof id !== 'undefined' && id !== '' ) {
							url = url+'/'+id;
							type = 'PUT';
							delete data.releaseDate;
						}

						// Add custom fields to data object
						for (var i=0; i<msg.items.length; i++) if (typeof formData[msg.items[i].name] !== 'undefined') data.fields[msg.items[i].name] = '';

						// Fill the data object with form values
						for (var key in formData) {
							if (typeof allFields[key] !== 'undefined') data[key] = formData[key];
							else if (typeof data.fields[key] !== 'undefined') data.fields[key] = formData[key];
						}

						$.ajax({
							url: url,
							type: type,
							connection: 'keep-alive',
							contentType: 'application/json',
							headers: {'Authorization': bcpie.api.token()},
							data: JSON.stringify(data),
							async: false
						});
					});
				},
				delete: function(webapp,id) {
					$.ajax({
						url: '/api/v2/admin/sites/current/webapps/'+webapp+'/items/'+id,
						type: 'DELETE',
						connection: 'keep-alive',
						contentType: 'application/json',
						headers: {'Authorization': bcpie.api.token()}
					});
				}
			}
		}
	},
	frontend: {
		webapp: {
			item: {
				new: function(webappid,data,success,error) {
					// still need to provide secure domain if there is an Amount field
					$.ajax({
						url: '/CustomContentProcess.aspx?CCID='+webappid+'&OTYPE=1',
						type: 'POST',
						data: data,
						success: function(response) {
							if (typeof success !== 'undefined') success(response);
						},
						error: function(response) {
							if (typeof error !== 'undefined') error(response);
						},
					});
				},
				update: function(webappid,itemid,data,success,error) {

				}
			},
			search: function(webappid,formid,responsePageID,data) {
				var response = $.ajax({
					url: '/Default.aspx?CCID='+webappid+'&FID='+formid+'&ExcludeBoolFalse=True&PageID='+responsePageID,
					type: 'POST',
					data: data,
					async: false
				});
				return $(response.responseText).find('.webappsearchresults').children();
			}
		},
		crm: {
			update: function(data,success,error) {
				$.ajax({
					url: '/MemberProcess.aspx',
					type: 'POST',
					data: data,
					success: function(response) {
						if (typeof success !== 'undefined') success(response);
					},
					error: function(response) {
						if (typeof error !== 'undefined') error(response);
					},
				});
			}
		}
	},
	utils: {
		_jsonify_brace: /^[{\[]/,
		_jsonify_token: /[^,:{}\[\]]+/g,
		_jsonify_quote: /^['"](.*)['"]$/,
		_jsonify_escap: /(["])/g,
		escape: function(str) { return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"); },
		jsonify: function(str) {
			// Wrap with `{}` if not JavaScript object literal
			str = $.trim(str);
			if (bcpie.utils._jsonify_brace.test(str) === false) str = '{'+str+'}';

			// Retrieve token and convert to JSON
			return str.replace(bcpie.utils._jsonify_token, function (a) {
				a = $.trim(a);
				// Keep some special strings as they are
				if ('' === a || 'true' === a || 'false' === a || 'null' === a || (!isNaN(parseFloat(a)) && isFinite(a))) return a;
				// For string literal: 1. remove quotes at the top end; 2. escape double quotes in the middle; 3. wrap token with double quotes
				else return '"'+ a.replace(bcpie.utils._jsonify_quote, '$1').replace(bcpie.utils._jsonify_escap, '\\$1')+ '"';
			});
		},
		guid: function() {
			function s4() {
				return Math.floor((1+Math.random()) * 0x10000).toString(16).substring(1);
			}
			return s4()+s4()+'-'+s4()+'-'+s4()+'-'+s4()+'-'+s4()+s4()+s4();
		},
		serializeObject: function(object) {
			var o = {};
			var a = object.serializeArray();
			for (var i=0; i<a.length; i++) {
				if (o[a[i].name] !== undefined) {
					if (!o[a[i].name].push) o[a[i].name] = [o[a[i].name]];
					o[a[i].name].push(a[i].value || '');
				}
				else o[a[i].name] = a[i].value || '';
			}
			return o;
		},
		closestChildren: function(selector,match,findAll,results) {
			/* the results parameter is used internally by the function */
			var $children = (selector instanceof jQuery) ? selector.children() : $(selector).children();
			if ($children.length === 0) {
				if (typeof results === 'object') return results;
				else return $();
			}
			if (typeof results === 'object') results = results.add($children.filter(match));
			else results = $children.filter(match);

			if (findAll !== true) return (results.length > 0) ? results : $children.closestChildren(match);
			else return bcpie.utils.closestChildren($children.not(results),match,findAll,results);
		},
		searchArray: function(array,value) {
			// Best for large arrays. For tiny arrays, use indexOf.
			for (var i = 0; i < array.length; i++) {
				if (array[i] === value) return i;
			}
			return -1;
		}
	},
	extensions: {
		settings: function(selector,options,settings) {
			if (typeof settings.name === 'string' && settings.name.toLowerCase() !== 'run' && settings.name.toLowerCase() !== 'settings') {
				if (typeof settings.defaults === 'undefined') settings.defaults = {};
				selector.data('bcpie-'+settings.name.toLowerCase()+'-settings', $.extend({}, settings.defaults, options, bcpie.globals));
				bcpie.active.tricks[settings.name] = settings.version;
				return selector.data('bcpie-'+settings.name.toLowerCase()+'-settings');
			}
		},
		engine: function() {
			var tricks = bcpie.extensions.tricks,trick,options,instances,instance,arr=[],str="",options={},module = [],functions = {},defaults = {};
			for (trick in tricks) {
				arr=[],str="",options={},module = [],functions = {},defaults = {};
				instances = $(doc).find('[data-bcpie-'+trick.toLowerCase()+']');
				for (var a = 0; a<instances.length; a++) {
					options = {},instance = $(instances[a]);
					str = instance.data('bcpie-'+trick.toLowerCase());
					if (typeof str === 'string' && str.indexOf(':') > -1) {
						if (str.indexOf(';') > -1) {
							str = str.split(';');
							for (var e=0;e<str.length;e++){
								arr = str[e].split(':');
								options[$.trim(arr[0])] = GetOptionValue($.trim(arr.slice(1).join(':')));
							}
						}else {
							arr = str.split(':');
							options[$.trim(arr[0])] = GetOptionValue($.trim(arr.slice(1).join(':')));
						}
					}
					bcpie.extensions.tricks[trick](instance,options);
				}
			}
			function GetOptionValue(valstr){
				switch(valstr.toLowerCase()){
					case 'true': return true;
					case 'false': return false;
					default: return valstr;
				}
			}
		},
		tricks: {} // populated automatically
	}
};
bcpie.globals = $.extend({},bcpie.globals,globals);
// Initialize tricks
$(function() {
	bcpie.extensions.engine();
});
/*
 * "ActiveNav". An awesome trick for BC Pie.
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie, or as licensed in Dev-in-a-Box from http://www.bcappstore.com/apps/dev-in-a-box
*/

bcpie.extensions.tricks.ActiveNav = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'ActiveNav',
		version: '2015.02.02',
		defaults: {
			navClass: 'activenav',
			activeClass: 'active',
			level: 1,
			levelClass: 'level',
			lastLevel: 0,
			lastLevelClass: 'lastlevel',
			levelTitle: false,
			levelTitleClass: 'leveltitle',
			unlinkTitle: false,
			removeHidden: true,
			activeHash: false,
			hashSupport: true,
			hashOffset: 30,
			removeClass: '',
			paramSupport: false
		}
	});

	// vars
	var shortPath, activeLinks, currentLink, gotIt = 0, first, segment, last, currentHash;

	settings.navClass = classObject(settings.navClass);
	settings.activeClass = classObject(settings.activeClass);
	settings.levelClass = classObject(settings.levelClass);
	settings.lastLevelClass = classObject(settings.lastLevelClass);
	settings.levelTitleClass = classObject(settings.levelTitleClass);
	settings.removeClass = classObject(settings.removeClass);
	settings.primaryDomain = settings.primaryDomain.replace('http:','');
	settings.secureDomain = settings.secureDomain.replace('https:','');


	function classObject(classes) {
		return {
			names: classes,
			selector: '.'+classes.replace(/ /g,'.')
		};
	}
	function makeActive(activeLinks, first, last) {
		for(var i=0, len = $(activeLinks).size(); i<len;i++){
			var _this = activeLinks[i];
			$(_this).parentsUntil(first, 'li').addClass(settings.activeClass.names);
			$(_this).closest(first).children('ul').addClass(settings.levelClass.names);
		}

		if (settings.level > 1 && settings.levelTitle !== false) {
			$(settings.levelClass.selector).parent('li').addClass(settings.levelTitleClass.names);
			if (settings.levelTitle !== false && settings.unlinkTitle !== false) {
				$(settings.levelTitleClass.selector).children('a').replaceWith('<span>' + $(settings.levelTitleClass.selector).children('a').html() + '</span>');
			}
		}
		if (settings.level > 1 && settings.removeHidden === true) {
			if (settings.levelTitle !== false) {
				segment = $(settings.levelTitleClass.selector).detach();
				selector.children('ul').html(segment);
			} else {
				segment = selector.find(settings.levelClass.selector).detach();
				selector.html(segment);
			}
		}
	}
	function updateHashUrl(hash) {
		if (settings.activeHash) history.pushState({}, "", hash);
	}

	function initHashChange(hash) {
		settings.hash = hash || win.location.hash;

		currentHash = settings.hash;
		settings.pathArray = $.grep(settings.pathArray, function(el) {
			return (el.indexOf('#') == -1 || el == settings.hash);
		});
		initActiveNav();
	}

	function initActiveNav() {
		shortPath = settings.path.toLowerCase() + win.location.search.toLowerCase() + settings.hash.toLowerCase();
		selector.find(settings.activeClass.selector).removeClass(settings.activeClass.names);
		if (settings.paramSupport === true) settings.pathArray.push(win.location.search);
		if (settings.hash !== '') settings.pathArray.push(settings.hash.toLowerCase());

		// This loop returns all matching links from the first iteration that has a match (within level), then exits the loop;
		for (var i = settings.pathArray.length - 1; i >= 0; i--) {
			// Go through each link
			activeLinks = first.find('a').filter(function(index) {
				if (settings.paramSupport === true) currentLink = $(this).attr('href');
				else currentLink = $(this).attr('href').split('?')[0];
				currentLink = currentLink.toLowerCase().replace('https:','').replace('http:','').replace(settings.primaryDomain,'').replace(settings.secureDomain,'');
				if (currentLink.indexOf('/') !== 0) currentLink = '/'+currentLink;

				if (currentLink === shortPath) {
					gotIt = 1;
					return true;
				}
			});
			if (gotIt === 1) {
				break;
			} else {
				// shorten shortPath and go through the loop again.
				shortPath = shortPath.replace(settings.pathArray[i], '');
			}
		}
		if (activeLinks.length > 1) {
			// Filter remaining activeLinks
			activeLinks = activeLinks.filter(function(index) {

				// shortPath needs to be reset for each link we go through
				shortPath = settings.path.toLowerCase();

				if (settings.path === '/') {
					return true;
				} else {
					for (var i = settings.pathArray.length - 1; i >= 0; i--) {
						if (settings.paramSupport === true) currentLink = $(this).attr('href').toLowerCase();
						else currentLink = $(this).attr('href').split('?')[0].toLowerCase();
						if (currentLink === shortPath) {
							return true;
						} else if (shortPath !== "") {
							shortPath = shortPath.replace(settings.pathArray[i], '');
						}
					}
				}
			});
		}
		if (activeLinks.length > 0) {
			makeActive(activeLinks, first, last);
			if ($.trim(settings.removeClass.names).length > 0) {
				selector.find(settings.removeClass.selector).addBack().removeClass(settings.removeClass.names);
			}
		}else if (selector.find(settings.levelClass.selector).size() === 0){
			if (settings.level > 1) {
				selector.children('ul').remove();
			}else {
				selector.children('ul').addClass(settings.levelClass.names);
			}
		}
	}

	function outOfView(elem) {
		var docViewTop = $(win).scrollTop();
		var docViewBottom = docViewTop + $(win).height();

		var elemTop = $(elem).offset().top;
		return (elemTop > docViewBottom);
	}
	function inViewTopBottom(elem) {
		var docViewTop = $(win).scrollTop();
		var elemTop = $(elem).offset().top;
		var elemBottom = elemTop + $(elem).height();
		return (docViewTop < elemBottom && docViewTop > elemTop - settings.hashOffset);
	}

	// Add the window hashchange event, to add the active class on hash change
	$(win).off('hashchange');
	$(win).on('hashchange', function() {
		initHashChange();
	});

	if (settings.hashSupport) { // If hashSupport is true. url and navigation automatically updates on page scroll at certain positions
		currentHash = settings.hash;
		var hashLinks = selector.find('a[href*="' + settings.path + '#"]');
		for(var i=0,len = $(hashLinks).size(); i<len;i++){
			$('#' + $(hashLinks[i]).attr('href').split('#')[1]).addClass('hash');
		}

		$(doc).off('scroll.ActiveNav');
		$(doc).on('scroll.ActiveNav', function() {
			for(var i=0, len = body.find('.hash').size(); i<len; i++){
				var top = win.pageYOffset, _this=$(body.find('.hash')[i]);
				var distance = top - _this.offset().top;
				var hash = _this.attr('id');
				//if (distance < settings.hashOffset && distance > (-1 * settings.hashOffset) && (currentHash != hash || currentHash.length == 0)) {
				if (inViewTopBottom(_this) && (currentHash != hash || currentHash.length === 0)) {
					currentHash = '#' + hash;
					initHashChange(currentHash);
					updateHashUrl('#' + hash);
				}
			}
			if ($('.hash').size() > 0){
				if (outOfView($('.hash')[0])) {
					currentHash = '';
					initHashChange(currentHash);
					updateHashUrl('#');
				}
			}
		});
	}

	// Add .activenav to the selector element
	selector.addClass(settings.navClass.names);

	// find level
	first = $(selector);
	if (settings.level > 1) {
		for (var i = settings.level - 1; i > 0; i--) {
			first = bcpie.utils.closestChildren(first,'li', true);
		}
	}
	// find lastLevel
	if (settings.lastLevel > 0) {
		last = $(selector);
		for (var i = settings.lastLevel; i > 0; i--) {
			last = bcpie.utils.closestChildren(last,'li', true);
		}
	} else last = 0;

	$(last).parent('ul').addClass(settings.lastLevelClass.names);
	if (last !== 0 && settings.removeHidden === true) {
		bcpie.utils.closestChildren(selector.find(settings.lastLevelClass.selector),'ul', true).remove();
	}

	initActiveNav();
};
/*
 * "Calendar". An awesome trick for BC Pie.
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie
*/

bcpie.extensions.tricks.Calendar = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'Calendar',
		version: '2015.02.01',
		defaults: {
			template: null, // also: 'this' (uses contents of selector), a css selector (uses contents of specified element on the page), or a path (uses contents of specified page retrieved via Ajax)
			pathContainer: '.calendar', // the containing element for the calendar template when 'template' is set to a path
			weekOffset: 0, // 0 starts the week on Sunday
			startWithMonth: 'now',
			click: null, // specify a function to run when this event is fired. Returns a 'target' object containing the DOM element, any events, and the date as a moment.js object.
			nextMonth: null, // specify a function to run when this event is fired. Fired when a user goes forward a month. returns a moment.js object set to the correct month.
			previousMonth: null, // specify a function to run when this event is fired. Fired when a user goes back a month. returns a moment.js object set to the correct month.
			onMonthChange: null, // specify a function to run when this event is fired. Fired when a user goes back OR forward a month. returns a moment.js object set to the correct month.
			today: null, // specify a function to run when this event is fired. Fired when a user goes to the current month/year. returns a moment.js object set to the correct month.
			nextButton: 'clndr-next-button', // the target classnames that CLNDR will look for to bind events. these are the defaults.
			previousButton: 'clndr-previous-button', // the target classnames that CLNDR will look for to bind events. these are the defaults.
			todayButton: 'clndr-today-button', // the target classnames that CLNDR will look for to bind events. these are the defaults.
			day: 'day', // the target classnames that CLNDR will look for to bind events. these are the defaults.
			empty: 'empty', // the target classnames that CLNDR will look for to bind events. these are the defaults.
			events: null, //
			dateParameter: 'date', // if you're supplying an events array, dateParameter points to the field in your event object containing a date string. It's set to 'date' by default.
			showAdjacentMonths: true, // show the numbers of days in months adjacent to the current month (and populate them with their events). defaults to true.
			adjacentDaysChangeMonth: true, // when days from adjacent months are clicked, switch the current month. Fires nextMonth/previousMonth/onMonthChange click callbacks. defaults to true.
			doneRendering: null, // a callback when the calendar is done rendering. This is a good place to bind custom event handlers.
		}
	});

	// Assign the template variable
	var template;
	if (settings.template === 'this') template = selector.html();
	else if (settings.template.indexOf('/') > -1) {
		$.ajax({
			url: settings.template,
			dataType: 'html'
		}).done(function (response) {
			response = $(response);
			if (response.is(pathContainer)) template = response.html();
			else template = response.find(pathContainer).html();
		});

	}else template = body.find(settings.template).html();
	if (typeof template === 'undefined' || template.length === 0 || settings.template === null ) {
		template = '<div class="clndr-grid">'+
						'<div class="days-of-the-week clearfix">'+
							'<% _.each(daysOfTheWeek, function(day) { %>'+
								'<div class="header-day"><%= day %></div>'+
							'<% }); %>'+
						'</div>'+
						'<div class="days clearfix">'+
							'<% _.each(days, function(day) { %>'+
								'<div class="<%= day.classes %>" id="<%= day.id %>">'+
									'<span class="day-number"><%= day.day %></span>'+
								'</div>'+
							'<% }); %>'+
						'</div>'+
					'</div>';
	}

	// Parse the formatting for date strings, and then create a moment
	function makeMoment(string) {
		if (typeof settings.site.countryCode === 'undefined') settings.site.countryCode = 'US';
		switch(settings.countries[settings.site.countryCode].ContinentCode) {
			case 'NA': order = 'MDY'; break;
			default: order = 'DMY';
		}
		return moment(string,moment.parseFormat(ref,{preferredOrder: order}));
	}

	// Setup the event callbacks
	var clickEvents = {};
	if (settings.click !== null && typeof win[settings.click] === 'function') clickEvents.click = win[settings.click]();
	if (settings.nextMonth !== null && typeof win[settings.nextMonth] === 'function') clickEvents.nextMonth = win[settings.nextMonth]();
	if (settings.previousMonth !== null && typeof win[settings.previousMonth] === 'function') clickEvents.previousMonth = win[settings.previousMonth]();
	if (settings.onMonthChange !== null && typeof win[settings.onMonthChange] === 'function') clickEvents.onMonthChange = win[settings.onMonthChange]();
	if (settings.today !== null && typeof win[settings.today] === 'function') clickEvents.today = win[settings.today]();

	return selector.clndr({
		template: template,
		weekOffset: settings.weekOffset,
		startWithMonth: makeMoment(settings.startWithMonth),
		clickEvents: clickEvents,
		targets: {
			nextButton: settings.nextButton,
			previousButton: settings.previousButton,
			todayButton: settings.todayButton,
			day: settings.day,
			empty: settings.empty
		},
	});
};
/*
 * "Crumbs". An awesome trick for BC Pie.
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie, or as licensed in Dev-in-a-Box from http://www.bcappstore.com/apps/dev-in-a-box
*/

bcpie.extensions.tricks.Crumbs = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'Crumbs',
		version: '2015.01.31',
		defaults: {
			separator: '/',
			makespace: '-',
			ajax: true,
			showHome: false,
			homeTitle: 'Home'
		}
	});

	/* define variables */
		var separator = ' '+settings.separator+' ',crumbArray,crumbURL,crumb,
		reg,pageArray,paramArray,path,breadcrumbs = '',i=0,useAjax = (settings.ajax===true || settings.ajax==='true') ? true : false;
		crumbArray = settings.pathArray; // This may change its value later in the script, so it's best not to use our global.
		paramArray = settings.paramArray;
		path = settings.path; // This may change its value later in the script, so it's best not to use our global.
		reg = new RegExp(settings.makespace,'g'); // create array of pagenames based on the url
		pageArray = path.replace(reg,' ').split('/');
		pageArray.shift(); // remove the first item (it's empty)
		if (settings.showHome !== false) pageArray.unshift(settings.homeTitle);
		crumbURL = win.location.hostname;
	/* end variable definitions */

	/* cleanup messy paths */
		switch (path) {
			case '/ForumRetrieve.aspx':
				crumbURL += '/ForumRetrieve.aspx';
				crumbArray = paramArray;
				if (settings.param.contains('NoTemplate')) {
					crumbArray.pop();
				}
				break;
			case '/FAQRetrieve.aspx':
				crumbURL += '/FAQRetrieve.aspx';
				crumbArray = paramArray;
				break;
			default: crumbArray = crumbArray;
		}
	/* end cleanup messy paths */

	/* define functions */
		function urlCrumbName (i,crumb,pageArray,paramArray) {
			// choolse the information source for crumb
			crumb = pageArray[i];

			// create rules for special pages
			switch (crumb) {
				case 'OrderRetrievev2.aspx' : crumb = 'shopping cart';break;
				case 'ForumRetrieve.aspx' : crumb = 'forum';break;
				case 'ForumRegister.aspx' : crumb = 'forum registration';break;
				default : crumb = crumb;
			}
			if (paramArray!==undefined) {
				switch (paramArray[0]) {
					case '?Step=13' : crumb = 'checkout';break;
					default : crumb = crumb;
				}
			}
			return crumb;
		}
		function ajaxCrumbName (crumb,response,bcID,pagenameAttr) {
			// choolse the information source for crumb
			crumb = $(response).filter('#'+bcID).data(pagenameAttr);
			return crumb;
		}
		function breadcrumb (i,crumbArray,breadcrumbs,crumbURL,crumb,separator) {
			// put the current breadcrumb together
			if (i<crumbArray.length-1) {
				breadcrumbs = '<a href="'+crumbURL+'">'+crumb+'</a>'+separator;
			}else {
				breadcrumbs = '<span class="this_crumb">'+crumb+'</span>';
			}
			return breadcrumbs;
		}
	/* end function definitions */

	/* build breadcrumbs */
		if (useAjax) {
			// build crumbs with Ajax
			while (i<crumbArray.length) {
				crumbURL += crumbArray[i];
				if (path === '/FAQRetrieve.aspx' && i===0) {
					crumbURL = '/faq';	// workaround for FAQs module
				}else if (i === crumbArray.length-1) {
					breadcrumbs += '<span class="this_crumb">'+settings.pageName+'</span>';
				}else {
					$.ajax({
						url: crumbURL,
						type: 'GET',
						dataType: 'html',
						async: false,
						success: function(response) {
							if (settings.pageAddress === $(response).filter('#'+settings.modulesID).data(settings.pageAddressAttr)) return;
							if (crumbArray[i] === '/' && settings.showHome !== false && settings.homeTitle !== null) {
								crumb = crumb;
							}else {
								crumb = ajaxCrumbName (crumb,response,settings.modulesID,settings.pageNameAttr);
							}
							breadcrumbs += breadcrumb (i,crumbArray,breadcrumbs,crumbURL,crumb,separator);
						},
						error: function (response){
							if(response.status===404) {
								// Skip this crumb. Breadcrumbs are meant to show us the way back, not match the menu or URL structure.
								// crumb = urlCrumbName (i,crumb,pageArray,paramArray);
								// breadcrumbs += breadcrumb (i,crumbArray,breadcrumbs,crumbURL,crumb,separator);
							}
						}
					});
				}
				i++;
			}
		}else {
			// build crumbs from URL
			while (i<crumbArray.length) {
				crumbURL += crumbArray[i];
				if (crumbArray[i] === '/' && settings.showHome !== false && settings.homeTitle !== null) {
					crumb = crumb;
				}else {
					crumb = urlCrumbName (i,crumb,pageArray,paramArray);
				}
				breadcrumbs += breadcrumb (i,crumbArray,breadcrumbs,crumbURL,crumb,separator);
				i++;
			}
		}
		if (settings.showHome === true) breadcrumbs = '<a href="/">'+settings.homeTitle+'</a>'+separator+breadcrumbs;
		breadcrumbs = '<span>'+breadcrumbs+'</span>';
	/* end build breadcrumbs */
	return selector.html(breadcrumbs);
};
/*
 * Date
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie, or as licensed in Dev-in-a-Box from http://www.bcappstore.com/apps/dev-in-a-box
*/

bcpie.extensions.tricks.Date = function(selector,options){
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'Date',
		version: '2015.01.29',
		defaults: {
			format: 'YYYY',
			add: '',
			subtract: '',
			moment: 'auto',
			utc: false,
			timezone: '',
			ref: 'text', // specify an html attribute (inputs will assume 'text' means 'value'). You can also say 'now' to use the current date and time.
			target: 'text', // specify an html attribute (inputs will default to 'value'). Separate multiple targets with commas.
			event: 'load' // specify the window event that triggers Date's behavior
		}
	});

	if (settings.add !== '') settings.add = $.parseJSON(bcpie.utils.jsonify(settings.add));
	if (settings.subtract !== '') settings.subtract = $.parseJSON(bcpie.utils.jsonify(settings.subtract));

	var ref,value,targets,parseFormat,order;

	function runDate() {
		// determine the reference
		if (settings.ref === 'text' && selector.is('input')) settings.ref = 'value';
		ref = (settings.ref === 'text') ? selector.text() : selector.prop(settings.ref);

		if(settings.ref === 'now') value = moment();
		else if (ref !== '') {
			if (settings.moment === 'auto' && $.isNumeric(ref) && ref.length === 10) {
				if (settings.utc === true) value = moment.utc(moment.unix(ref)).local();
				else value = moment.unix(ref);
			}else {
				if (typeof settings.site.countryCode === 'undefined') settings.site.countryCode = 'US';
				switch(settings.countries[settings.site.countryCode].ContinentCode) {
					case 'NA': order = 'MDY'; break;
					default: order = 'DMY';
				}
				parseFormat = (settings.moment === 'auto') ? moment.parseFormat(ref,{preferredOrder: order}) : settings.moment;
				value = moment(ref,parseFormat);
			}

			if (value.isAfter(moment()) && ref.match(/(?:\/|-)([0-9]{2})$/)) value = value.subtract('year',100);
		}
		if (settings.timezone !== '') value.tz(settings.timezone);
		if (typeof value !== 'undefined' && value._isAMomentObject === true) {
			value = value.add(settings.add).subtract(settings.subtract).format(settings.format);

			targets = settings.target.split(',');
			for (var i=0; i<targets.length; i++) {
				if (targets[i] === 'text' && selector.is('input')) targets[i] = 'value';
				(targets[i] === 'text') ? selector.text(value) : selector.prop(targets[i],value);
			}
		}
	}
	runDate();
	if (settings.event !== 'load') {
		body.on(settings.event, selector, function() {
			runDate();
		});
	}
};
/*
 * "FormMagic". An awesome trick for BC Pie.
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie, or as licensed in Dev-in-a-Box from http://www.bcappstore.com/apps/dev-in-a-box
*/

bcpie.extensions.tricks.FormMagic = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'FormMagic',
		version: '2015.01.31',
		defaults: {
			'requiredClass' : 'required',
			'errorGroupElement' : 'div',
			'errorGroupClass' : 'error-group',
			'errorMessageElement' : 'small',
			'errorClass' : 'error',
			'messageBoxID' : null,
			'messageMode' : 'prepend', // 'append', 'box'
			'restoreMessageBox' : true, // If submission result is empty, the contents of messageBox will be restored. This is particularly helpful with live searches.
			'afterAjax' : 'remove', // 'hide', 'show'
			'useAjax' : false,
			'validateMode' : 'alert', // 'inline'
			'fieldTitleAttr' : 'label', // or specify a field attribute
			'systemMessageClass' : 'system-message',
			'systemErrorMessageClass' : 'system-error-message',
			'successClass' : 'success',
			'submitEvent' : null,
			'submitField' : '[type="submit"]',
			'beforeSubmit' : null, // deprecated. Replaced with validationSuccess.
			'validationSuccess' : null, // specify a function to run after validation, but before submission
			'validationError' : null, // specify a function to run after validation returns errors
			'noSubmit' : false, // allow form submission to be bypassed after successful validation.
			'ajaxSuccess' : null, // specify a function to run after an Ajax submission 'success' response
			'ajaxError' : null, // specify a function to run after an Ajax submission 'error' response
			'ajaxComplete' : null, // specify a function to run after an Ajax submission 'complete' response
			'multistep' : false,  // True if this is a multistep form or validations are to be done in steps
			'containers' : '', // multistep container selectors, separated by comma
			'continueButton' : '', // Continue button selector for multi step form
			'backButton' : '', // back button selector for multi step form
			'buttonOnSubmit' : 'disable', // none,disable,hide
			'buttonAfterSubmit' : 'enable', //none,enable,hide,show,disable
			'customError' : null, // specify a custom validation function to run against a comma delimeted list of selectors
			'customErrorFields' : '' // takes a comma delimited list of selectors to match against during validation
		}
	});

	// validationFunctions.js and EN validatelang
	if (typeof jslang == "undefined") var jslang = ("EN");
	else {
		if (jslang == "JP") jslang = "JA";
		if (jslang == "CS") jslang = "CZ";
		if (jslang == "SI") jslang = "SL";
		LoadLangV(jslang);
	}
	if (validatelang === undefined && jslang === 'EN') {
		var validatelang = {
			Currency: {
				MustNumber: " must be a number and cannot be empty\n",
				NoSymbol: " amount you entered must be a number without currency symbol\n"
			},
			Number: {
				MustNumber: " must be a number and cannot be empty\n",
				NoDecimal: " must be a number (no decimal points) and cannot be empty\n"
			},
			Float: {
				MustNumber: " must be a number and may contain a decimal point.\n"
			},
			Enter: {
				PleaseEnter: "- Please enter "
			},
			Select: {
				PleaseSelect: "- Please select ",
				MustSelect: " must be selected\n"
			},
			Email: {
				ValidEmail: "- Please enter a valid email address\n",
				Illegal: "- The email address contains illegal characters\n"
			},
			CheckDate: {
				ValidDate: " as a valid date.\n"
			},
			Others: {
				CannotContain: " cannot contain ",
				WhiteSpace: "white spaces\n",
				Character: "character.\n"
			},
			IP: {
				Illegal: "- Please enter a valid IP Address"
			}
		};
	}
	function LoadLangV(b) {
		if (document.getElementById("RADEDITORSTYLESHEET0")) return;
		else {
			var c = document.createElement("script");
			c.setAttribute("src", "/BcJsLang/ValidationFunctions.aspx?lang=" + b);
			document.getElementsByTagName("head")[0].appendChild(c);
		}
	}
	function formfield(j, d) {
		switch (d) {
			case "firstupper":
				var b = true;
				var e = true;
				for (var g = 1; g < j.length; g++) {
					var f = j.charCodeAt(g);
					if (f >= 65 && f <= 90) e = false;
					if (f >= 97 && f <= 127) b = false;
				}
				if (b || e) {
					var h = j.split(" ");
					j = "";
					for (var g = 0; g < h.length; g++) {
						if (h[g].length >= 1) j = j + " " + h[g].substring(0, 1).toUpperCase() + h[g].substring(1).toLowerCase();
					}
				}
				j = j.replace(".", "");
				j = j.replace(",", "");
				break;
			case "firstupperspecial":
				var h = j.split(" ");
				j = "";
				for (var g = 0; g < h.length; g++) {
					if (h[g].length >= 1) j = j + " " + h[g].substring(0, 1).toUpperCase() + h[g].substring(1);
				}
				break;
			case "alllower":
				j = j.toLowerCase(); break;
			case "allupper":
				j = j.toUpperCase(); break;
			default: break;
		}
		if (j.substring(0, 1) == " ") j = j.substring(1);
		return j;
	}
	function isCurrency(b, d) {
		var g = "";
		if (b.length === 0) g = "- " + d + validatelang.Currency.MustNumber;
		else {
			for (var f = 0; f < b.length; f++) {
				var e = b.charAt(f);
				if ((e < "0") || (e > "9")) {
					if (e != "." && e != ",") {
						g = "- " + d + validatelang.Currency.NoSymbol;
					}
				}
			}
		}
		return g;
	}
	function isNumeric(b, d) {
		var g = "";
		if (b.length === 0) g = "- " + d + validatelang.Number.MustNumber;
		else {
			var f;
			for (f = 0; f < b.length; f++) {
				var e = b.charAt(f);
				if ((e < "0") || (e > "9")) {
					g = "- " + d + validatelang.Number.NoDecimal;
					return g;
				}
			}
		}
		return g;
	}
	function isFloat(b, d) {
		var g = "";
		var f;
		if (b.length === 0) g = "- " + d + validatelang.Float.MustNumber;
		else {
			for (f = 0; f < b.length; f++) {
				var e = b.charAt(f);
				if (((e < "0") || (e > "9"))) {
					if (e != "." && e != ",") {
						g = "- " + d + validatelang.Float.MustNumber;
						return g;
					}
				}
			}
		}
		return g;
	}
	function isEmpty(d, c) {
		var b = "";
		if (d.trim().length === 0) b = validatelang.Enter.PleaseEnter + c + "\n";
		return b;
	}
	function checkDropdown(d, c) {
		var b = "";
		if (d === null) d = "";
		if (d.length === 0 || d == " " || d === "") b = validatelang.Select.PleaseSelect + c + "\n";
		return b;
	}
	function checkEmail(e) {
		var b = "";
		if (e.length > 0) {
			var c = /^[^@]+@[^@]+\.[^@]{2,6}$/;
			if (!(c.test(e))) b = validatelang.Email.ValidEmail;
			else {
				var d = /[\+\(\)\<\>\,\;\:\\\"\[\]]/;
				if (e.match(d)) b = validatelang.Email.Illegal;
			}
		}else b = validatelang.Email.ValidEmail;
		return b;
	}
	function checkSelected(c, e) {
		var b = "- " + e + validatelang.Select.MustSelect;
		if (c.length > 0) {
			for (var d = 0; d < c.length; d++) {
				if (c[d].disabled === false && c[d].checked === true) b = "";
			}
		}else if (c.disabled === false && c.checked === true) b = "";
		return b;
	}
	function getRadioSelected(b) {
		if (b.length > 0) {
			for (var c = 0; c < b.length; c++) {
				if (b[c].disabled === false && b[c].checked === true) {
					return b[c].value;
				}
			}
		}else if (b.disabled === false && b.checked === true) return b.value;
		return null;
	}
	function checkSelectedX(c, h) {
		var b = "- " + h + validatelang.Select.MustSelect;
		var e = document.getElementById(c);
		var g = e.getElementsByTagName("td");
		var f;
		for (var d = 0; d < g.length; d++) {
			f = g[d].firstChild;
			if (f && (f.type == "checkbox" || f.type == "radio")) {
				if (f.disabled === false && f.checked === true) b = "";
			}
		}
		return b;
	}
	function checkSpaces(e, c) {
		var b = "";
		for (var d = 0; d < e.length; d++) {
			if (e.charAt(d) == " ") b = "- " + c + validatelang.Others.CannotContain + validatelang.Others.WhiteSpace;
		}
		return b;
	}
	function checkUrlChar(f, d) {
		var b = "";
		for (i = 0; i < f.length; i++) {
			var e = f.charAt(i);
			switch (e) {
				case "/":
				case "\\":
				case "#":
				case "?":
				case ":":
				case "@":
				case "=":
				case "&":
				case '"':
				case "|":
				case "_":
				case ".":
				case "%":
					b = "- " + d + validatelang.Others.CannotContain + "[" + e + "] " + validatelang.Others.Character;
					return b;
			}
		}
		return b;
	}
	function isInteger(b) {
		var e;
		if (b.length === 0) return false;
		for (e = 0; e < b.length; e++) {
			var d = b.charAt(e);
			if (((d < "0") || (d > "9"))) return false;
		}
		return true;
	}
	function checkDate(c, b) {
		var e = "";
		if (c.length === 0) {
			e = validatelang.Enter.PleaseEnter + b + validatelang.CheckDate.ValidDate;
			return e;
		}
		return e;
	}
	function appendBreak(b) {
		return b += "\n";
	}
	String.prototype.trim = function() {
		a = this.replace(/^\s+/, "");
		return a.replace(/\s+$/, "");
	};

	function addEventSimple(d, c, b) {
		if (d.addEventListener) d.addEventListener(c, b, false);
		else if (d.attachEvent) d.attachEvent("on" + c, b);
	}
	function sendRequestSync(d, f, e) {
		var c = createXMLHTTPObject();
		if (!c) return;
		var b = (e) ? "POST" : "GET";
		c.open(b, d, false);
		c.setRequestHeader("User-Agent", "XMLHTTP/1.0");
		if (e) c.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		c.send(e);
		if (c.status === 200) return c.responseText;
	}
	var XMLHttpFactories = [
		function() {
			return new XMLHttpRequest();
		},
		function() {
			return new ActiveXObject("Msxml2.XMLHTTP");
		},
		function() {
			return new ActiveXObject("Msxml3.XMLHTTP");
		},
		function() {
			return new ActiveXObject("Microsoft.XMLHTTP");
		}
	];

	function createXMLHTTPObject() {
		var d = false;
		for (var c = 0; c < XMLHttpFactories.length; c++) {
			try {
				d = XMLHttpFactories[c]();
			} catch (b) {
				continue;
			}
			break;
		}
		return d;
	}
	for (var i = 0; i < document.forms.length; i++) {
		initCaptchaOnForm(document.forms[i]);
	}
	function initCaptchaOnForm(b) {
		if (b._CaptchaHookedUp) return;
		if (!b.CaptchaV2) return;
		if (!b.CaptchaHV2) return;
		b._CaptchaHookedUp = true;
	}
	function captchaIsInvalid(h, e, j) {
		if ((h._CaptchaTextValidated === true) && (h._CaptchaTextIsInvalid === false)) return "";
		if (typeof h.ReCaptchaChallenge != "undefined") {
			var c = Recaptcha.get_challenge();
			var g = Recaptcha.get_response();
			if (g.trim().length === 0) return "- " + e;
			h.ReCaptchaAnswer.value = Recaptcha.get_response();
			h.ReCaptchaChallenge.value = Recaptcha.get_challenge();
			var d = sendRequestSync("/ValidateCaptcha.ashx?key=" + c + "&answer=" + g + "&imageVerificationType=recaptcha");
			h._CaptchaTextIsInvalid = d == "false";
			h._CaptchaTextValidated = true;
			if (h._CaptchaTextIsInvalid) regenerateCaptcha(h);
		}else {
			var c = $(h).find('[name=CaptchaHV2]').val();
			var g = $(h).find('[name=CaptchaV2]').val();
			var b = 6;
			if (g.trim().length === 0) return "- " + e;
			if (g.length != b) h._CaptchaTextIsInvalid = true;
			else {
				var d = sendRequestSync("/ValidateCaptcha.ashx?key=" + c + "&answer=" + g);
				h._CaptchaTextIsInvalid = d == "false";
				h._CaptchaTextValidated = true;
				if (h._CaptchaTextIsInvalid) regenerateCaptcha(h);
			}
		}
		if (h._CaptchaTextIsInvalid) return "- " + j;
		return "";
	}
	function regenerateCaptcha(h) {
		h._CaptchaTextValidated = false;
		h._CaptchaTextIsInvalid = true;
		if (typeof h.ReCaptchaChallenge != "undefined") Recaptcha.reload();
		else {
			var d = sendRequestSync("/CaptchaHandler.ashx?Regenerate=true&rand=" + Math.random());
			h.CaptchaHV2.value = d;
			h.CaptchaV2.value = "";
			var j = h.getElementsByTagName("img");
			if (j.length === 0) {
				if ((h.parentNode.nodeName.toLowerCase() == "p") && (h.parentNode.nextSibling) && (h.parentNode.nextSibling.nodeName.toLowerCase() == "table") && (h.parentNode.nextSibling.className == "webform")) {
					j = h.parentNode.nextSibling.getElementsByTagName("img");
				}
			}
			for (var b = 0; b < j.length; b++) {
				var m = j[b].src;
				var c = m.toLowerCase();
				if (c.indexOf("/captchahandler.ashx") > -1) {
					var g = c.indexOf("?id=") + 4;
					var k = c.indexOf("&", g);
					var l = m.substring(g, k);
					var e = m.replace(l, d);
					j[b].src = e;
					break;
				}
			}
		}
	}
	function isNumericIfVisible(b, d) {
		var g = "";
		if (b.style.display == "inline") {
			if (b.value.length === 0) g = "- " + d + validatelang.Number.MustNumber;
			else {
				var f;
				for (f = 0; f < b.value.length; f++) {
					var e = b.value.charAt(f);
					if ((e < "0") || (e > "9")) {
						g = "- " + d + validatelang.Number.NoDecimal;
						return g;
					}
				}
			}
		}
		return g;
	}
	function checkIPAddress(c) {
		var b = /^\s*((0|[1-9]\d?|1\d{2}|2[0-4]\d|25[0-5])\.){3}(0|[1-9]\d?|1\d{2}|2[0-4]\d|25[0-5])\s*$/;
		if (b.test(c)) return "";
		return validatelang.IP.Illegal;
	}

	// setup some local variables
	var action = selector.attr('action'),requiredFields,required=[],submitCount=0,
		errorArray=[],errorElement='<'+settings.errorGroupElement+' class="'+settings.errorGroupClass+'"></'+settings.errorGroupElement+'>',newRequired,pass={},
		errorTarget,successMessage,messageElement,selectorResponse,onChangeBinding,errorElementExists,errorCount=0,autoRequire,currentName,submitField,
		paymentMethods = selector.find('[name="PaymentMethodType"]'), onlyCCMethod = false, multistepContainers = [],requiredMultistep=[],
		containerIndex=0, lockSubmit = false, messageBox = (settings.messageBoxID === null) ? $('<div id="ajaxresponse" />') : $('#'+settings.messageBoxID),
		 messageBoxContents = $('#'+settings.messageBoxID).html(), customFlag = false,msg,
		labelFallback = {'Title' : 'Title', 'FirstName' : 'First Name', 'LastName' : 'Last Name', 'FullName' : 'Full Name', 'EmailAddress' : 'Email Address', 'Username' : 'Username', 'Password' : 'Password', 'HomePhone' : 'Home Phone Number', 'WorkPhone' : 'Work Phone Number', 'CellPhone' : 'Cell Phone Number', 'HomeFax' : 'Home Fax Number', 'WorkFax' : 'Work Fax Number', 'HomeAddress' : 'Home Address', 'HomeCity' : 'Home City', 'HomeState' : 'Home State', 'HomeZip' : 'Home Zip', 'HomeCountry' : 'Home Country', 'WorkAddress' : 'WorkAddress', 'WorkCity' : 'Work City', 'WorkState' : 'Work State', 'WorkZip' : 'Work Zip', 'WorkCountry' : 'Work Country', 'WebAddress' : 'Web Address', 'Company' : 'Company', 'DOB' : 'Date of Birth', 'PaymentMethodType' : 'Payment Method', 'BillingAddress' : 'Billing Address', 'BillingCity' : 'Billing City', 'BillingState' : 'Billing State', 'BillingZip' : 'Billing Zip Code', 'BillingCountry' : 'Billing Country', 'ShippingAddress' : 'Shipping Address', 'ShippingCity' : 'Shipping City', 'ShippingState' : 'Shipping State', 'ShippingZip' : 'Shipping Zip Code', 'ShippingCountry' : 'Shipping Country', 'ShippingInstructions' : 'Shipping Instructions', 'ShippingAttention' : 'Shipping Attention', 'Friend01' : 'Friend Email 1', 'Friend02' : 'Friend Email 2', 'Friend03' : 'Friend Email 3', 'Friend04' : 'Friend Email 4', 'Friend05' : 'Friend Email 5', 'Message' : 'Friend Message', 'Anniversary1Title' : 'Anniversary Title', 'Anniversary1' : 'Anniversary', 'Anniversary2Title' : 'Anniversary 2 Title', 'Anniversary2' : 'Anniversary 2', 'Anniversary3Title' : 'Anniversary 3 Title', 'Anniversary3' : 'Anniversary 3', 'Anniversary4Title' : 'Anniversary 4 Title', 'Anniversary4' : 'Anniversary 4', 'Anniversary5Title' : 'Anniversary 5 Title', 'Anniversary5' : 'Anniversary 5', 'FileAttachment' : 'File Attachment', 'CAT_Custom_1423_326' : 'Gender', 'CAT_Custom_1424_326' : 'Height', 'CAT_Custom_1425_326' : 'Marital Status', 'CAT_Custom_1426_326' : 'Has Children', 'CAT_Custom_1427_326' : 'Years in Business', 'CAT_Custom_1428_326' : 'Number of Employees', 'CAT_Custom_1429_326' : 'Annual Revenue', 'CAT_Custom_1430_326' : 'Financial Year', 'InvoiceNumber' : 'Invoice Number', 'CardName' : 'Name on Card', 'CardNumber' : 'Card Number', 'CardExpiryMonth' : 'Card Expiry Month', 'CardExpiryYear' : 'Card Expiry Year', 'CardType' : 'Card Type', 'CardCCV' : 'CCV Number', 'CaptchaV2' : 'Captcha'};

	if (settings.customErrorFields !== '') settings.customErrorFields = settings.customErrorFields.split(',');

	function runValidation (required,counter,total) {
		var rdoChkFlag = false;
		if (counter===0) {errorCount=0;}

		// Check the field for a value change
		required.value = (required.field.val() === undefined) ? '' : required.field.val();

		// verify field types and make adjustments to them as needed.
		if (required.type === 'text' || required.type === 'hidden' || required.type === 'password') {
			switch (required.name) {
				case 'EmailAddress' : required.type = 'email';      break;
				case 'Friend01'     : required.type = 'email';      break;
				case 'Friend02'     : required.type = 'email';      break;
				case 'Friend03'     : required.type = 'email';      break;
				case 'Friend04'     : required.type = 'email';      break;
				case 'Friend05'     : required.type = 'email';      break;
				case 'DOB'          : required.type = 'date';       break;
				case 'Anniversary1' : required.type = 'date';       break;
				case 'Anniversary2' : required.type = 'date';       break;
				case 'Anniversary3' : required.type = 'date';       break;
				case 'Anniversary4' : required.type = 'date';       break;
				case 'Anniversary5' : required.type = 'date';       break;
				case 'Anniversary5' : required.type = 'date';       break;
				case 'CaptchaV2'    : required.type = 'captcha';    break;
				case 'CardNumber'   : required.type = 'number';     break;
				case 'CardCCV'      : required.type = 'number';     break;
				case 'Amount'       : required.type = 'currency';   break;
				case 'Password'     : required.type = 'password';   break;
				case 'PasswordConfirm'  : required.type = 'passwordconfirm';break;
				case 'Days'         : required.type = 'days';       break;
				default             : required.type = 'text';
			}
		}


		for (var i=0; i<settings.customErrorFields.length; i++) {
			if (required.field.is(settings.customErrorFields[i])) {
				customFlag = true;
				break;
			}else customFlag = false;
		}
		if (customFlag === true && settings.customError !== '') {
			$.when(executeCallback(win[settings.customError],required)).then(function(value) {
				required.message = (typeof value === 'undefined') ? '' : value;
			});
		}else {
			// Run the appropriate validator for the field type
			switch (required.type) {
				case 'select'     : required.message = checkDropdown(required.value, required.label); break;
				case 'radio'      : required.message = checkSelected(selector.find('[name="'+required.name+'"]'), required.label); break;
				case 'checkbox'     : required.message = checkSelected(selector.find('[name="'+required.name+'"]'), required.label); break;
				case 'email'      : required.message = checkEmail(required.value); break;
				case 'date'       : required.message = checkDate(required.value,required.label); break;
				case 'password'     : required.message = (required.value !== "" && required.value.length < 6) ? "- Password must be 6 characters or longer" : isEmpty(required.value,required.label);pass.value = required.value;pass.label = required.label; break;
				case 'passwordconfirm'  : required.message = (pass.value.length > 0 && pass.value !== required.value) ? pass.label+' and '+required.label+' do not match' : ''; break;
				case 'captcha'      : required.message = captchaIsInvalid(selector[0], "Enter Word Verification in box", "Please enter the correct Word Verification as seen in the image"); break;
				case 'currency'     : required.message = isCurrency(required.value, required.label); break;
				case 'number'     : required.message = isNumeric(required.value, required.label); break;
				case 'days'       : required.message = isNumericIfVisible(required.field, required.label); break;
				default         : required.message = isEmpty(required.value,required.label);
			}
		}

		required.message = required.message.replace('- ','').replace('\n','');
		if (required.message !=='') {errorCount++;}

		if (settings.validateMode==='alert') {
			if (required.message !=='') {
				if (errorCount===1) {
					errorArray = '- '+required.message+'\n';
				}else {
					errorArray += '- '+required.message+'\n';
				}
			}
			if (counter===total-1 && errorCount !== 0) {
				alert(errorArray);
			}
		}else if (settings.validateMode==='inline') {
			switch (required.type) {
				case 'radio' : errorTarget = selector.find('label[for="'+required.name+'"]'); rdoChkFlag=true; break;
				case 'checkbox' : errorTarget = selector.find('label[for="'+required.name+'"]'); rdoChkFlag = true; break;
				case 'captcha' : errorTarget = (selector.find('#recaptcha_widget_div').length > 0) ? selector.find('#recaptcha_widget_div') : required.field; break;
				default : errorTarget = required.field;
			}
			if (errorTarget.parent().is(settings.errorGroupElement+'.'+settings.errorGroupClass)) {
				errorElementExists = true;
			}else {
				errorElementExists = false;
			}

			if (required.message !=='') {
				if (errorElementExists) {
					// just replace the error message
					errorTarget.siblings(settings.errorMessageElement+'.'+settings.errorClass).text(required.message);
				}else {
					// add the message into new element
					messageElement = '<'+settings.errorMessageElement+' class="'+settings.errorClass+'">'+required.message+'</'+settings.errorMessageElement+'>';
					errorTarget.addClass(settings.errorClass).wrap(errorElement);
					if (rdoChkFlag) selector.find('[name="' + required.name + '"]').addClass(settings.errorClass);
					errorTarget.parent().append(messageElement);
				}
			}else if (errorElementExists) {
				// remove the element
				errorTarget.siblings(settings.errorMessageElement+'.'+settings.errorClass).remove();
				errorTarget.removeClass(settings.errorClass).unwrap();
				if (rdoChkFlag) selector.find('[name="' + required.name + '"]').removeClass(settings.errorClass);
			}
		}
	}
	function buttonSubmitBehaviour(behavior){
		var submitButton = selector.find('[type="submit"]');
		switch(behavior){
			case 'show':
				submitButton.show();
				break;
			case 'hide':
				submitButton.hide();
				break;
			case 'disable':
				submitButton.attr('disabled','disabled');
				break;
			case 'enable':
				submitButton.removeAttr('disabled');
				break;
			default:
				submitButton.show();
				submitButton.removeAttr('disabled');
		}
	}
	function submitForm(submitCount) {
		if (submitCount===0) {

			buttonSubmitBehaviour(settings.buttonOnSubmit);
			if (settings.useAjax) {
				$.ajax({
					type: 'POST',
					url: action,
					data: selector.serialize(),
					success: function(response) {
						var messageClass = '';
						if (response.indexOf(settings.systemMessageClass) > 0) messageClass = settings.systemMessageClass;
						else if (response.indexOf(settings.systemErrorMessageClass) > 0) messageClass = settings.systemErrorMessageClass;

						if (messageClass !== '') msg = $(response).find('.'+messageClass);
						else if ($(response).is('font')) msg = $(response);

						if ($(msg).size() > 0) successMessage = msg;
						else successMessage = $(response).filter('.'+messageClass);
						showSuccess(selector,successMessage);

						if (settings.ajaxSuccess !== null) executeCallback(window[settings.ajaxSuccess],response);
					},
					error: function(xhr,status) {
						if (settings.ajaxError !== null) executeCallback(window[settings.ajaxError],status);
						return false;
					},
					complete: function(xhr,status) {
						if (settings.ajaxComplete !== null) executeCallback(window[settings.ajaxComplete],status);
						buttonSubmitBehaviour(settings.buttonAfterSubmit);
					}
				});
			}else {
				selector.off('submit').submit();
			}
			return submitCount++;
		}else{
			alert("This form has already been submitted. Please refresh the page if you need to submit again.");
			return false;
		}
	}
	function executeCallback(callback,param){
		if (typeof callback === 'function') {
			var deferred = $.Deferred();
			if (param) deferred.resolve(callback(selector,param));
			else deferred.resolve(callback(selector));

			return deferred.promise();
		}
	}
	function showSuccess(selector,successMessage) {
		if (settings.afterAjax!=='show') {selector.fadeOut(0);}
		if (settings.messageMode === 'append') selector.after(messageBox);
		else if (settings.messageMode === 'prepend') selector.before(messageBox);

		if (successMessage.html().replace(/\n/g,'').replace(/	/g,'').replace(/ /g,'').length === 0 && settings.restoreMessageBox === true) successMessage = messageBoxContents;
		else if(successMessage.find('.search-results').length) successMessage = successMessage.find('.search-results').html();
		messageBox.html(successMessage).fadeIn();

		if (settings.afterAjax==='remove') {selector.remove();}
	}
	function buildRequiredObject(rField,i) {
		required[i] = {
			name : rField.attr('name'),
			field : rField,
			type : (rField.is('input')) ? rField.attr('type') : rField.get(0).tagName.toLowerCase(),
			value : (rField.val() === undefined) ? '' : rField.val(),
			label : (selector.find('label[for="'+rField.attr('name')+'"]').length > 0) ? selector.find('label[for="'+rField.attr('name')+'"]').text() : rField.attr('placeholder')
		};
		if (required[i].label === undefined) required[i].label = labelFallback[required[i].name];
	}
	function buildMultistepRequiredObject(rField,i) {
		requiredMultistep[i] = {
			name : rField.attr('name'),
			field : rField,
			type : (rField.is('input')) ? rField.attr('type') : rField.get(0).tagName.toLowerCase(),
			value : (rField.val() === undefined) ? '' : rField.val(),
			label : (selector.find('label[for="'+rField.attr('name')+'"]').length > 0) ? selector.find('label[for="'+rField.attr('name')+'"]').text() : rField.attr('placeholder')
		};
		if (requiredMultistep[i].label === undefined) requiredMultistep[i].label = labelFallback[requiredMultistep[i].name];
	}
	function autoRequirePaymentFields(){
		if (paymentMethods.filter(':checked').val() == '1' || onlyCCMethod)
			selector.find('[name="CardName"], [name="CardNumber"], [name="CardExpiryMonth"], [name="CardExpiryYear"], [name="CardType"], [name="CardCCV"]').addClass(settings.requiredClass);
		else
			selector.find('[name="CardName"], [name="CardNumber"], [name="CardExpiryMonth"], [name="CardExpiryYear"], [name="CardType"], [name="CardCCV"]').removeClass(settings.requiredClass);
		BuildRequiredObjectArray();
	}
	function BuildRequiredObjectArray(){
		var i = 0,_this = null;
		required=[];
		// Build required array
		requiredFields = selector.find('input, select, button, textarea').filter('.'+settings.requiredClass);

		for(var cnt=0,len = requiredFields.size(); cnt < len; cnt++){
			_this = requiredFields[cnt];
			newRequired = selector.find('[name="'+$(_this).attr("name")+'"]').not('.'+settings.requiredClass);
			if (newRequired.length > 0) {
				for(var cnt2=0, len2 = $(newRequired).size(); cnt2<len2; cnt2++){
					var newRequiredItem = $(newRequired[cnt2]);
					newRequiredItem.addClass(settings.requiredClass);
					buildRequiredObject(newRequiredItem,i);
					i++;
				}
			}
			buildRequiredObject($(_this),i);
			i++;
		}
	}
	function showHideNavButtons(index){
		if (multistepContainers.length === 0){
			selector.find(settings.continueButton + ',' + settings.backButton).hide();
			selector.find(settings.submitField).show();
		}
		else if (index === 0){
			selector.find(settings.submitField+', ' + settings.backButton).hide();
			selector.find(settings.continueButton).show();
		}
		else if (index == multistepContainers.length -1){
			selector.find(settings.continueButton).hide();
			selector.find(settings.submitField+', ' + settings.backButton).show();
		}
		else{
			selector.find(settings.continueButton + ',' + settings.backButton).show();
			selector.find(settings.submitField).hide();
		}
	}

	// Auto Require certain fields
	autoRequire = ['FirstName','LastName','FullName','EmailAddress','CaptchaV2','ItemName'];
	for (var i = 0; i< autoRequire.length; i++) {
		autoRequire.field = selector.find('[name="'+autoRequire[i]+'"]');
		if (autoRequire.field.length > 0 && autoRequire.field.not('.'+settings.requiredClass)) autoRequire.field.addClass(settings.requiredClass);
	}

	// Auto require credit card fields depending upon payment method
	if (paymentMethods.size() == 1)
			if ($(paymentMethods[0]).val() == '1') onlyCCMethod = true;
	//autoRequirePaymentFields();
	selector.on('click',paymentMethods,autoRequirePaymentFields);
	// BuildRequiredObjectArray();



	// If multistep true configure validations on containers
	if (settings.multistep){
		var cont = settings.containers.split(',');
		selector.on('keypress',function(e) {
			if (e.keyCode == 13) {
				e.preventDefault();
				if (selector.find(settings.continueButton).filter(':visible').size() > 0) selector.find(settings.continueButton).filter(':visible').trigger('click');
				else selector.find('[type="submit"]:visible').trigger('click');
			}
		});
		for (var i = 0, len = $(cont).size(); i < len; i++) {
			var _this = $(cont[i]);
			multistepContainers.push(_this);
		}
		selector.on('click',settings.continueButton,function(){
			buildMultiRequiredObjects(containerIndex);
			for (var i = 0;i<requiredMultistep.length;i++) {
				runValidation(requiredMultistep[i],i,requiredMultistep.length);
			}
			if (errorCount===0) moveToContainer(++containerIndex);

			// Now that submission has been attempted, allow active field validation.
			if (settings.validateMode === 'inline') {
				// Set onChangeBinding to true in order to prevent these bindings from occuring multiple times.
				if (requiredMultistep.length>0) {
					for (var i = 0;i<requiredMultistep.length;i++) {
						selector.off('change.multistep',requiredMultistep[i].field);
						selector.on('change.multistep',requiredMultistep[i].field,function() {
							currentName = $(this).attr('name');
							for (var i = 0;i<requiredMultistep.length;i++) {
								if (currentName === requiredMultistep[i].name) runValidation(requiredMultistep[i],0,1);
							}
						});
					}
				}
			}
		});
		selector.on('click',settings.backButton,function(){
			moveToContainer(--containerIndex);
		});
		moveToContainer(containerIndex);
	}
	// Move to container specified by index, (default 0)
	function moveToContainer(index){
		showHideNavButtons(index);
		if (index > multistepContainers.length -1){
			index = multistepContainers.length - 1;
			return;
		}

		var currContainer = multistepContainers[index];
		requiredMultistep = [];

		for (var count=0,len=$(multistepContainers).size(); count < len; count++){
			$(multistepContainers[count]).removeClass('activeContainer').hide();
		}


		currContainer.addClass('activeContainer').show();
		if (index > 0) selector.get(0).scrollIntoView();
	}
	function buildMultiRequiredObjects (index) {
		var currContainer = multistepContainers[index];
		requiredMultistep = [];

		// Build required array
		requiredFields = currContainer.find('input, select, button, textarea').filter('.'+settings.requiredClass);
		var i = 0;
		for (var cnt = 0, len = $(requiredFields).size(); cnt < len; cnt++){
			_this = requiredFields[cnt];
			newRequired = currContainer.find('[name="'+$(_this).attr("name")+'"]').not('.'+settings.requiredClass);
			if (newRequired.length > 0) {
				for(var cnt2=0, len2 = $(newRequired).size(); cnt2<len2; cnt2++){
					var newRequiredItem = $(newRequired[cnt2]);
					newRequiredItem.addClass(settings.requiredClass);
					buildMultistepRequiredObject(newRequiredItem,i);
					i++;
				}
			}
			buildMultistepRequiredObject($(_this),i);
			i++;
		}
	}

	// bind to the submit event of our form
	selector.on('submit',function(event) {
		event.preventDefault();

		autoRequirePaymentFields();
		BuildRequiredObjectArray();

		if (lockSubmit) return false;
		else lockSubmit = true;
		for (var i = 0;i<required.length;i++) {
			runValidation(required[i],i,required.length);
		}
		if (errorCount===0) {
			// providing backwards compatibility with beforeSubmit
			if (settings.beforeSubmit !== null && settings.validationSuccess === null) settings.validationSuccess = settings.beforeSubmit;

			if (settings.validationSuccess !== null) {
				$.when(executeCallback(win[settings.validationSuccess])).then(function(value) {
					if (value !== 'stop' && settings.noSubmit === false) submitForm(submitCount);
				});
			}else if (settings.noSubmit === false) submitForm(submitCount);
		}
		else
			if (settings.validationError !== null) executeCallback(window[settings.validationError]);
		// Now that submission has been attempted, allow active field validation.
		if (settings.validateMode === 'inline' && onChangeBinding !== true) {
			// Set onChangeBinding to true in order to prevent these bindings from occuring multiple times.
			onChangeBinding = true;
			if (required.length>0) {
				for (var i = 0;i<required.length;i++) {
					selector.on('change','[name="' + required[i].name + '"]', function() {
						currentName = $(this).attr('name');
						for (var i = 0;i<required.length;i++) {
							if (currentName === required[i].name) runValidation(required[i],0,1);
						}
					});
				}
			}
		}
		lockSubmit = false;
	});
	// Activate submitEvent
	if (settings.submitField !== '[type="submit"]') {
		submitField = selector.find(settings.submitField);
		if (submitField.length > 0 && settings.submitEvent !== null && settings.submitEvent === 'keyup' || settings.submitEvent === 'blur' || settings.submitEvent === 'change' || settings.submitEvent === 'dblclick') {
			selector.on(settings.submitEvent,settings.submitField,function(){
				selector.submit();
			});
		}
	}
};

/*
 * "Foundation". An awesome trick for BC Pie.
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie
*/

bcpie.extensions.tricks.Foundation = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'Foundation',
		version: '2015.01.31',
		defaults: {
			feature: null
		}
	});

	if (settings.feature === 'topbar') {
		selector.find('li').filter(function(){
			return $(this).children('ul').length > 0 && !$(this).is('.has-dropdown');
		}).addClass('has-dropdown');
		selector.find('.has-dropdown').filter(function(){
			return $(this).children('.dropdown').length === 0;
		}).removeClass('has-dropdown');
	}
};
/*
 * "SameAs". An awesome trick for BC Pie.
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie, or as licensed in Dev-in-a-Box from http://www.bcappstore.com/apps/dev-in-a-box
*/

bcpie.extensions.tricks.SameAs = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'SameAs',
		version: '2015.01.31',
		defaults: {
			bothWays : false,
			attributeType : 'name',
			clearOnUncheck : true,
			copy : null,
			altCopy : null,
			checkbox : null,
			altCheckbox : null,
			breakOnChange : false, // Requires bothWays:false
			prefix : '',
			suffix : '',
			copyType : 'simple', // concat,math,simple
			scope : 'form', // Uses 'form' or css selectors as values
			event : 'change', // specify the event that triggers the copy
			ref : 'value' // or text
		}
	});

	// Setup our variables
	var copyGroup = (settings.scope === 'form') ? selector.closest('form') : body.find(settings.scope),
		copyField, checkbox = copyGroup.find('['+settings.attributeType+'='+settings.checkbox+']'),
		copyFields=[],altCopyFields=[],altCheckbox = copyGroup.find('['+settings.attributeType+'='+settings.altCheckbox+']'),value;

	if(settings.copyType=="simple"){
		settings.copy = settings.copy.replace(/\[/g,"").replace(/\]/g,"");
		copyFields.push(copyGroup.find('['+settings.attributeType+'='+settings.copy+']').not(selector));
	}
	else if(settings.copyType == "alternate"){
		settings.bothWays = false;
		settings.copy = settings.copy.replace(/\[/g,"").replace(/\]/g,"");
		settings.altCopy =settings.altCopy.replace(/\[/g,"").replace(/\]/g,"");
		copyFields.push(copyGroup.find('['+settings.attributeType+'='+settings.copy+']').not(selector));
		altCopyFields.push(copyGroup.find('['+settings.attributeType+'='+settings.altCopy+']').not(selector));
	}
	else{
		settings.bothWays = false;
		GetFieldsResult(true);
	}

	function copyVal(selector,copyFields) {
		if(settings.copyType == "simple" || settings.copyType == "alternate"){
			if (settings.ref === 'text') {
				if (copyFields[0].is('select')) {
					value = copyFields[0].find('option').filter(':selected').text();
				}else if (copyFields[0].is('radio')) {
					value = copyFields[0].find('option').filter(':checked').text();
				}else {
					value = copyFields[0].text();
				}
			}else {
				value = copyFields[0].val();
			}
			if(value.length === 0 || ((settings.prefix.length > 0 || settings.suffix.length > 0) && settings.bothWays === true)) value = value;
			else value = settings.prefix + value + settings.suffix;
		}else value = settings.prefix + GetFieldsResult() + settings.suffix;

		if (selector.is('select,textarea,input')) selector.val(value);
		else selector.text(value);

		selector.trigger(settings.event+'.sameAs').trigger(settings.event);
	}
	function inputChange(selector,copyFields) {
		for (var i = copyFields.length - 1; i >= 0; i--) {
			$(copyFields[i]).on(settings.event+'.sameAs',function() {
				copyVal(selector,copyFields);
			});
		}

		if (settings.bothWays === true) {
			selector.on(settings.event+'.sameAs',function(){
				if (selector.val() !== copyFields[0].val()) {
					copyVal(copyFields[0],[selector]);
				}
			});
		}
	}
	function checkboxChange(chkbox,selector,copyFields) {
		if (chkbox.prop('checked')) {
			if(chkbox.attr(settings.attributeType) == settings.checkbox)
				altCheckbox.removeAttr('checked');
			else if(chkbox.attr(settings.attributeType) == settings.altCheckbox)
				checkbox.removeAttr('checked');

			copyVal(selector,copyFields);
			inputChange(selector,copyFields);
		}else {
			for (var i = copyFields.length - 1; i >= 0; i--) {
				copyFields[i].off(settings.event+'.sameAs');
			}
			selector.off(settings.event+'.sameAs');
			selector.val('').trigger(settings.event+'.sameAs').trigger(settings.event);
		}
	}
	function GetFieldsResult(init){
		return GetFieldsExpression(init);
	}
	function ConcatExpression(str){
		return str.replace(/\+/g,'').replace(/\-/g,'').replace(/\//g,'').replace(/\*/g,'').replace(/\)/g,'').replace(/\(/g,'');
	}
	function GetFieldsExpression(init){
		var strExpression = settings.copy,expr;
		strExpression = GetfieldVal(strExpression);
		try
		{
			if(settings.copyType == "math"){
				expr = Parser.parse(strExpression);
				return expr.evaluate();
			}
			else
				return ConcatExpression(strExpression);
		}
		catch(e){
			return ConcatExpression(strExpression);
		}

		function GetfieldVal(str){
			var sIndex = -1, eIndex=-1, mode = 0,str2 = str, i;
			for(i=0;i<str.length;i++){
				var charCode = str.charCodeAt(i);
				var field;
				if(charCode == 91 && sIndex == -1){
					sIndex = i;
					mode = 1;
					continue;
				}
				else if(mode == 1 && charCode == 93 && sIndex > -1){
					eIndex = i;
					field = $('['+settings.attributeType+'="' + str.substring(sIndex+1,eIndex)  + '"]');
					str2 = str2.replace(str.substring(sIndex,eIndex+1),field.val());
					if(init) copyFields.push(field);
					sIndex = -1;
					eIndex = -1;
					mode=0;
				}
				else if((charCode>=65 && charCode <=90) || (charCode>=97 && charCode <=122) && mode === 0){
					if(sIndex == -1)
					{
						sIndex = i;
						continue;
					}
				}
				else if(mode === 0 && sIndex > -1 && (charCode==42 || charCode==43|| charCode==45||charCode==47 || charCode == 41)){
					eIndex = i-1;
					field = $('['+settings.attributeType+'="' + str.substring(sIndex,eIndex+1)  + '"]');
					str2 = str2.replace(str.substring(sIndex,eIndex+1),field.val());
					if(init) copyFields.push(field);
					sIndex = -1;
					eIndex = -1;
				}
				else
				{
					continue;
				}
			}
			if(sIndex > -1){
				eIndex = i;
				var f = $('['+settings.attributeType+'="' + str.substring(sIndex,eIndex+1)  + '"]');
				str2 = str2.replace(str.substring(sIndex,eIndex+1),f.val());
				if(init) copyFields.push(f);
			}

			return str2;
		}
	}
	// Choose which method to use
	if (checkbox.length || altCheckbox.length) {
		if(checkbox.length){
			checkboxChange(checkbox,selector,copyFields);
			checkbox.on(settings.event+'.sameAs',function(){
				checkboxChange(checkbox,selector,copyFields);
			});
			if (settings.breakOnChange !== false) {
				selector.on('change',function() {
					checkbox.off(settings.event+'.sameAs');
					for (var i = copyFields.length - 1; i >= 0; i--) {
						copyFields[i].off(settings.event+'.sameAs');
					}
					selector.off(settings.event+'.sameAs');
				});
			}
		}
		if(altCheckbox.length){
			checkboxChange(altCheckbox,selector,altCopyFields);
			altCheckbox.on(settings.event+'.sameAs',function(){
				checkboxChange(altCheckbox,selector,altCopyFields);
			});
			if (settings.breakOnChange !== false) {
				selector.on('change',function() {
					altCheckbox.off(settings.event+'.sameAs');
					for (var i = altCopyFields.length - 1; i >= 0; i--) {
						altCopyFields[i].off(settings.event+'.sameAs');
					}
					selector.off(settings.event+'.sameAs');
				});
			}
		}
	}else {
		copyVal(selector,copyFields);
		inputChange(selector,copyFields);
		if (settings.breakOnChange !== false) {
			selector.on('change',function() {
				for (var i = copyFields.length - 1; i >= 0; i--) {
					copyFields[i].off(settings.event+'.sameAs');
				}
				selector.off(settings.event+'.sameAs');
			});
		}
	}
};
/*
 * Secure
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie, or as licensed in Dev-in-a-Box from http://www.bcappstore.com/apps/dev-in-a-box
*/

bcpie.extensions.tricks.Secure = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'Secure',
		version: '2015.01.29',
		defaults: {
			unsecureLinks: true,
			onSessionEnd: '',
			sessionEndRedirect: '',
			securePayments: true
		}
	});

	var blurTime,status,secure = win.location.origin === settings.secureDomain,links,href,interval;

	if (settings.securePayments === true) {
		if (selector.find('[name="Amount"]').length > 0 && secure === false) {
			win.location.href = settings.secureDomain+settings.pageAddress;
		}
	}
	if(settings.onSessionEnd !== '' || settings.sessionEndRedirect !== ''){
		if(settings.user.isLoggedIn === true) {
			sessionBehavior();
			bindSessionEvents();
		}
	}
	if(settings.unsecureLinks === true) unsecureLinks();

	function unsecureLinks () {
		if (secure === true) {
			links = selector.find('a').not('[href^="mailto:"]').not('[href="/LogOutProcess.aspx"]');
			for (var i=0; i<links.length; i++) {
				href = $(links[i]).attr("href") || '';
				if (href.indexOf('http') === -1 && href.indexOf('//') === -1 && href.indexOf('#') === -1) {
					href = (href.indexOf('/') !== 0) ? settings.primaryDomain+'/'+href : settings.primaryDomain+href;
					$(links[i]).attr('href', href);
				}
			}
		}
	}
	function sessionBehavior() {
		$.ajax({
			url: '/',
			type: 'GET',
			success: function(response) {
				if ($(response).filter('#bcmodules').data('bc-loginstatus') === false) {
					if (settings.sessionEndRedirect !== '') win.location.href = settings.primaryDomain+settings.sessionEndRedirect;
					if (settings.onSessionEnd !== '') executeCallback(window[settings.onSessionEnd]);
					clearInterval(interval);
				}
			}
		});
	}
	function bindSessionEvents (argument) {
		interval = setInterval(function(){sessionBehavior();},900000); // 15min
		$(win).on('focus',function(){
			sessionBehavior();
		});
	}
	function executeCallback(callback){
		if(typeof callback === 'function') {
			var deferred = $.Deferred();
			deferred.resolve(callback());
			return deferred.promise();
		}
	}
};
/*
 * ThemeClean
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie
*/

bcpie.extensions.tricks.ThemeClean = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'ThemeClean',
		version: '2015.01.28'
	});

	$('link').filter(function(){
		return $(this).attr('href').toLowerCase().indexOf('.css') > -1;
	}).not(function(){
		return ['modulestylesheets.css','theme.css'].indexOf($(this).attr('href').toLowerCase()) > -1;
	}).remove();
};
/*
 * "Trigger". An awesome trick for BC Pie.
 * http://bcpie.com
 * Copyright 2015, ONE Creative
 * Free to use in BC Pie, or as licensed in Dev-in-a-Box from http://www.bcappstore.com/apps/dev-in-a-box
*/

bcpie.extensions.tricks.Trigger = function(selector,options) {
	var settings = bcpie.extensions.settings(selector,options,{
		name: 'Trigger',
		version: '2015.01.29',
		defaults: {
			trigger: '',
			event: 'click', // or change
			triggerValue: '', // value to be used in change event. Separate multiple values with commas.
			triggerAttr: 'value', // attribute to obtain the value from when using triggerValue.
			onClass: '', // css class to be applied
			offClass: '', // css class to be applied
			toggle: false, // if true, class will be toggled on events
			onCallback: '', // on callback
			offCallback: '' // off callback
		}
	});

	var triggerEl = (settings.trigger === '') ? selector : $(settings.trigger);
	settings.triggerValue = settings.triggerValue.split(',');

	// specified special event change, else a generic event of class application and callbacks will be applied
	switch(settings.event){
		case 'change':
			changeTrigger();
			triggerEl.on(settings.event,changeTrigger); break;
		default:
			triggerEl.on(settings.event,triggerEvent);
	}


	// Generic event for all events
	function triggerEvent(){
			if(settings.toggle === true) {
				if(selector.hasClass(settings.onClass) && settings.onClass !== '') {
					selector.removeClass(settings.onClass);
					executeCallback(settings.offCallback);
				}else {
					selector.addClass(settings.onClass);
					executeCallback(settings.onCallback);
				}
				if(selector.hasClass(settings.offClass) && settings.offClass !== '') {
					selector.removeClass(settings.offClass);
					executeCallback(settings.onCallback);
				}else {
					selector.addClass(settings.offClass);
					executeCallback(settings.offCallback);
				}
			}else {
				selector.addClass(settings.onClass);
				executeCallback(settings.onCallback);
			}
	}

	// Change event
	function changeTrigger(){
			var found = 0;
			for (var i=0; i<settings.triggerValue.length; i++) {
				if(GetValue(triggerEl) == settings.triggerValue[i]) found ++;
			}
			if(found > 0){
				selector.removeClass(settings.offClass).addClass(settings.onClass);
				executeCallback(settings.onCallback);
			}else{
				selector.removeClass(settings.onClass).addClass(settings.offClass);
				executeCallback(settings.offCallback);
			}
	}
	function GetValue(triggerElement) {
		var value;
		if (settings.triggerAttr === 'value') {
			if(triggerElement.is('[type=radio]'))
				return triggerElement.filter(':checked').val();
			else if(triggerElement.is('[type=checkbox]')){
				if(settings.triggerValue === '' && triggerElement.filter(':checked').size() > 0)
					return "";
				if(triggerElement.filter("[value='" + settings.triggerValue + "']:checked").size() > 0)
					return triggerElement.filter("[value='" + settings.triggerValue + "']:checked").val();
				else null;
			}else return triggerElement.val();
		}
		else {
			triggerElement.attr(settings.triggerAttr);
		}
	}
	// execute function helper
	function executeCallback(callbackName){
		if(callbackName.length > 0){
			var callback = window[callbackName];
			if(typeof callback === 'function') {
				var deferred = $.Deferred();
				deferred.resolve(callback());
				return deferred.promise();
			}
		}

	}
};