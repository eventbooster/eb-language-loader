/**
* Loads translations from server, caches them for 1h in localStorage, as the request ist pretty big (~400kb)
* See http://angular-translate.github.io/docs/#/guide/13_custom-loaders
*
* localStorage: key is «locales», contains two fields: 
* - fetchTimeStamp: timestamp the locales were fetched from server
* - locales: locales gotten from server, formatted
*/ 

angular
.module( "eb.languageLoader", [] )
.factory( 'LanguageLoaderService', [ "$http", "$q", function ( $http, $q ) {

	// return loaderFn
	return function () {

		var deferred = $q.defer();

		if( getLocalesFromStorage() ) {
			deferred.resolve( getLocalesFromStorage() );
		}
		else {
			getLocalesFromServer()
				.then ( function( locales ) {
					console.log( "Take locales from server: %o", locales );
					deferred.resolve( locales );
				}, function( err ) {
					return $q.reject( err );
				} );
		}

		return deferred.promise;

	};





	/**
	* Tries to get locales from local storage; returns them or false
	*/
	function getLocalesFromStorage() {

		var storedLocales = localStorage.getItem( "locales" );

		// Not available
		if( !storedLocales ) {
			return false;
		}

		storedLocales = JSON.parse( storedLocales );

		// Properties missing
		if( !storedLocales.locales || !storedLocales.fetchTimeStamp ) {
			console.warn( "Missng properties in localStorage.locales: " + JSON.stringify( storedLocales ) );
			return false;
		}

		// Older than 1h
		if( storedLocales.fetchTimeStamp < new Date().getTime() - 60*60*1000 ) {
			console.log( "Locales older than 1h" );
			return false;
		}

		// Wrong language
		if( storedLocales.language !== $( "html" ).attr( 'lang' ) ) {
			console.log( "Locales stored in wrong Language, request from server" );
			return false;
		}

		console.log( "Take locales from localStorage: %o", storedLocales.locales );
		return storedLocales.locales;

	}




	/**
	* Gets locales from server, stores them in localStorage
	* @return Promise
	*/
	function getLocalesFromServer() {

		return $http( { method: "GET", url: "/locales.json" /*, headers: headers*/ } )
			.then( function( response ) {

				var formattedLocales = formatLocales( response.data );

				// Put to localStorage
				var toStore = {
					fetchTimeStamp 		: new Date().getTime()
					, locales 			: formattedLocales
					, language 			: $( 'html' ).attr( 'lang' )
				};
				
				console.log( 'Store %o in localStorage', toStore );
				localStorage.setItem( 'locales', JSON.stringify( toStore ) );

				// Resolve
				return formattedLocales;

			}, function( data ) {
				
				var message = "Couldn't load locales. Status: " + data.status + ". Message: " + JSON.stringify( data.data );
				console.error( message );
				$q.reject( { code: 'serverError', message: message } );

			} );

	}


	/**
	* Translates server data into flat object of translations
	*/
	function formatLocales( serverData ) {

		var trans = {};

		if (!serverData || !serverData['web.cornercard.']) return trans;

		var data = serverData['web.cornercard.'];

		// Loop all translation keys
		Object.keys(data).forEach(function(localeKey) {

			var lang = $( "html" ).attr( 'lang' )
				, locale = data[localeKey];

			// Get right language
			if( !locale[lang] ) {
				console.warn( "Proper " + lang + " translation missing for " + localeKey + ":" + JSON.stringify( locale ) );
				return;
			}

			trans[localeKey] = locale[lang];

		});

		console.log( "LanguageLoaderService: Trans is %o", trans );

		return trans;

	}


} ] );