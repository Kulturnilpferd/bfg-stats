/*

 Copyright 2013 Jindrich Dolezy (dzindra)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 */
'use strict';

var d = new Date();
var mhs20sTotal = 0;
var mhsAvgTotal = 0;
var hwErrorsTotal = 0;
var app = angular.module('app', ['ngCookies']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.
        when('/stats', {templateUrl: 'partials/stats.html', controller: 'StatsCtrl'}).
        when('/pools', {templateUrl: 'partials/pools.html', controller: 'PoolsCtrl'}).
        otherwise({redirectTo: '/stats'});
}]);

app.service('RefreshService', ['$timeout', '$q', '$rootScope', function ($timeout, $q, $rootScope) {
    var refreshService = {
        timer: null,
        lastRefresh: 0,
        interval: 0,
        deferred: null,
        func: null,
        paused: false
    };

    var runTimer = function () {
        if (!refreshService.timer && refreshService.interval > 0 && !refreshService.paused) {
            refreshService.timer = $timeout(function () {
                refreshService.timer = null;
                refresh();
            }, refreshService.interval * 1000);
        }
    };

    var stopTimer = function () {
        if (refreshService.timer) {
            $timeout.cancel(refreshService.timer);
            refreshService.timer = null;
        }
    };

    var refreshInterval = function (delay) {
        if (typeof delay !== 'undefined') {
            stopTimer();
            refreshService.interval = delay;
            if (!refreshService.deferred)
                runTimer();
        }

        return refreshService.interval;
    };

    var refreshFunc = function (func) {
        if (typeof func !== 'undefined') {
            stopTimer();
            refreshService.func = func;
            refresh();
        }
        return refreshService.func;
    };

    var refresh = function () {
        if (refreshService.deferred)
            return;

        stopTimer();

        if (typeof refreshService.func === 'function') {
            $rootScope.$broadcast('refreshStarted');
            refreshService.deferred = $q.defer();
            refreshService.deferred.promise.then(function () {
                refreshService.lastRefresh = new Date();
                refreshService.error = null;

                $rootScope.$broadcast('refreshFinished', true, null);
                refreshService.deferred = null;
                runTimer();
            }, function (error) {
                if (error)
                    refreshService.error = error;

                $rootScope.$broadcast('refreshFinished', false, error);
                refreshService.deferred = null;
                runTimer();
            });
            refreshService.func(refreshService.deferred);
        }
    };

    return {
        refresh: refresh,
        refreshFunc: refreshFunc,
        interval: refreshInterval,
        error: function () {
            return refreshService.error
        },
        refreshing: function () {
            return refreshService.deferred != null
        },
        lastRefresh: function () {
            return refreshService.lastRefresh
        },
        refreshPaused: function (value) {
            if (typeof value !== 'undefined') {
                refreshService.paused = value;
                if (value) stopTimer(); else runTimer();
            }
            return refreshService.paused;
        }

    };
}]);

app.constant('cookieName', 'minerStatCookie');
app.run(['$cookieStore', 'RefreshService', 'cookieName', function ($cookieStore, RefreshService, cookieName) {
    RefreshService.interval($cookieStore.get(cookieName) || 5);

    var orig = RefreshService.interval;
    RefreshService.interval = function (delay) {
        if (typeof delay !== 'undefined')
            $cookieStore.put(cookieName, delay);

        return orig(delay);
    };
}]);


app.controller('MainCtrl', ['$scope', function ($scope) {
    $scope.$on('refreshStarted', function () {
        $scope.working = true;
    });
    $scope.$on('refreshFinished', function () {
        $scope.working = false;
    });
	
	function setDarkTheme() {
		document.getElementById("body").style.backgroundColor="#080808";
		document.getElementById("body").style.color="#fff";
	}
	
	function setLightTheme() {
		document.getElementById("body").style.backgroundColor="#fff";
		document.getElementById("body").style.color="#000";	
	}
	
	const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
	function switchTheme(e) {
		if (e.target.checked) {
			//dark
			localStorage.setItem('theme', 'dark'); //add this
			setDarkTheme();
		}
		else {
			//light
			localStorage.setItem('theme', 'light'); //add this
			setLightTheme();
		}    
	}
	toggleSwitch.addEventListener('change', switchTheme, false);
	
	const currentTheme = localStorage.getItem('theme') ? localStorage.getItem('theme') : null;
	if (currentTheme) {
		setLightTheme();
	
		if (currentTheme === 'dark') {
			toggleSwitch.checked = true;
			setDarkTheme();
		}
	}
}]);

app.controller('MenuCtrl', ['$scope', '$location', function ($scope, $location) {
    $scope.isMenuActive = function (value) {
        return $location.path() == value ? "active" : "";
    };
}]);

app.controller('StatsCtrl', ['$scope', '$http', 'RefreshService', function ($scope, $http, RefreshService) {
	
//CHart geht los		
function addData(chart, label, data1, data2) {
	chart.data.labels.push(label);
	//chart.data.datasets.forEach((dataset) => {
	//    dataset.data.push(data);
	//});
	chart.data.datasets[0].data.push(data1);
	chart.data.datasets[1].data.push(data2);
	chart.update();
}

	
var speedCanvas = document.getElementById("speedChart");

Chart.defaults.global.defaultFontFamily = "Lato";
Chart.defaults.global.defaultFontSize = 18;

var dataFirst = {
    label: "MH/s (20 sec)",
    //data: [20, 15, 60, 60, 65, 30, 70],
	pointRadius: 0,
    lineTension: 0,
	hitRadius: 6, 
	hoverRadius: 6,
    fill: true,
    borderColor: '#3e95cd',
	backgroundColor: 'rgba(62, 149, 205, 0.4)',	
  };
  
var dataSecond = {
    label: "MH/s (avg)",
    //data: [0, 59, 75, 20, 20, 55, 40],
	pointRadius: 0,
    lineTension: 0,
	hitRadius: 6, 
	hoverRadius: 6,
    fill: false,
    borderColor: '#50cc55',
  };

var speedData = {
  //labels: ["0s", "10s", "20s", "30s", "40s", "50s", "60s"],
  labels: [],
  datasets: [dataFirst, dataSecond]
};

var chartOptions = {
	legend: {
		display: true,
		position: 'top',
		labels: {
		  boxWidth: 80,
		  fontColor: '#696969'
		},
	},
	responsive: true,
    maintainAspectRatio: false,
};

var lineChart = new Chart(speedCanvas, {
  type: 'line',
  data: speedData,
  options: chartOptions,
});


//chart ende (paar zeilen weiter graph update funktion (time und formatierung müssen noch gemacht werden)




RefreshService.refreshFunc(function (deferred) {
	var g = $http.post('php/stats.php', {}, {cache: false});
	g.success(function (data) {
		if (data.status == 1) {
			$scope.devices = data.devices;
			$scope.pools = data.pools;
			//GRAPH UPDATE FUNKTION--------------------------------------------------------------
			let today = new Date()
			//addData(lineChart,today.toLocaleDateString() + " " + today.toLocaleTimeString(),mhs20sTotal.toFixed(3),mhsAvgTotal.toFixed(3));
			addData(lineChart,today.toLocaleTimeString(),mhs20sTotal.toFixed(3),mhsAvgTotal.toFixed(3));
			deferred.resolve();
		} else {
			if (!$scope.devices)
				$scope.devices = [];
			if (!$scope.pools)
				$scope.pools = [];

			deferred.reject(data.error);
		}
	});
	g.error(function (data, status) {
		deferred.reject("HTTP error " + status);
	});
});

$scope.getTotal = function (items, item, value) {
	$scope.total = 0;
	var totalArray = [];
	if (value == 'mhsAvg') {
		for(item in items){
			$scope.total += items[item].mhsAvg;
		}
		mhsAvgTotal = $scope.total;
		return $scope.total.toFixed(3);
	}
	if (value == 'mhs20s') {
		for(item in items){
			$scope.total += items[item].mhs20s;
		}
		mhs20sTotal = $scope.total;
		return $scope.total.toFixed(3);
	}
	if (value == 'utility') {
		for(item in items){
			totalArray.push(items[item].utility);
		}
		for(var i = 0; i < totalArray.length; i++){
			$scope.total += totalArray[i];
		}
		return ($scope.total / totalArray.length).toFixed(3);
	}
	if (value == 'accepted') {
		for(item in items){
			$scope.total += items[item].accepted;
		}
		return $scope.total.toFixed();
	}
	if (value == 'rejectedPct') {
		for(item in items){
			totalArray.push(items[item].rejectedPct);
		}
		for(var i = 0; i < totalArray.length; i++){
			$scope.total += totalArray[i];
		}
		return ($scope.total / totalArray.length).toFixed(4);
	}
	if (value == 'rejected') {
		for(item in items){
			$scope.total += items[item].rejected;
		}
		return $scope.total.toFixed();
	}
	
	if (value == 'hwErrorsPct') {
		for(item in items){
			totalArray.push(items[item].hwErrorsPct);
		}
		for(var i = 0; i < totalArray.length; i++){
			$scope.total += totalArray[i];
		}
		return ($scope.total / totalArray.length).toFixed(4);
	}
	
	if (value == 'hwErrors') {
		for(item in items){
			$scope.total += items[item].hwErrors;
		}
		return $scope.total.toFixed();
	}
};

$scope.isRefreshActive = function (value) {
	return value == RefreshService.interval() ? 'active' : '';
};

$scope.doRefresh = RefreshService.refresh;
$scope.setRefresh = RefreshService.interval;

$scope.$on('refreshFinished', function (event, status, error) {
	$scope.error = error;
	$scope.lastRefresh = RefreshService.lastRefresh();
});

$scope.$on('$destroy', function () {
	RefreshService.refreshFunc(null);
});

}]);

app.controller('PoolsCtrl', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $scope.pool = {};
    $scope.pools = [];
    $scope.buttonsDisabled = false;

    var call = function (params, callback) {
        if ($scope.buttonsDisabled)
            return;

        $scope.buttonsDisabled = true;
        $scope.message = '';
        $scope.error = '';
        $rootScope.$broadcast("refreshStarted");

        var r = $http.post('php/pools.php', params, {cache: false});
        r.success(function (data) {
            $scope.buttonsDisabled = false;
            if (data.status == 1) {
                if (callback) callback(data);
                $scope.message = data.message;
                $scope.pools = data.pools;
                $rootScope.$broadcast('refreshFinished', true, null);
            } else {
                $scope.error = data.error;
                $rootScope.$broadcast('refreshFinished', false, data.error);
            }
        });
        r.error(function (data) {
            $scope.buttonsDisabled = false;
            $scope.error = data.error;
            $rootScope.$broadcast('refreshFinished', false, data.error);
        });
    };

    $scope.add = function () {
        var pool = angular.copy($scope.pool);
        pool.command = "add";

        call(pool, function () {
            $scope.pool = {};
        });
    };

    $scope.deletePool = function (id) {
        call({command: "remove", id: id});
    };

    $scope.topPool = function (id) {
        call({command: "top", id: id});
    };

    $scope.enablePool = function (id) {
        call({command: "enable", id: id});
    };

    $scope.disablePool = function (id) {
        call({command: "disable", id: id});
    };

    $scope.refreshPools = function () {
        call({command: "list"});
    };

    $scope.isPoolDisabled = function (pool) {
        return pool.status == 'Disabled';
    };

    $scope.refreshPools();

}]);
