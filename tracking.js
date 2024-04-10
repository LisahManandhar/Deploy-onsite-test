const requestNotificationPermission = async () => {
	await window.Notification.requestPermission();
	// value of permission can be 'granted', 'default', 'denied'
	// granted: user has accepted the request
	// default: user has dismissed the notification permission popup by clicking on x
	// denied: user has denied the request.
};
const sendToSwan = (url, data) => {
	const xhr = new XMLHttpRequest();
	xhr.open('POST', url, true);
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.send(JSON.stringify(data));
};

/**
 * Converts a JSON object to a base64 string.
 *
 * @param {Object} json - The JSON object to be converted.
 * @returns {string} The base64 string obtained from the JSON object.
 */
const jsonToBase64 = (json) => {
	const str = JSON.stringify(json);
	const base64 = btoa(encodeURIComponent(str));
	return base64;
};

/**
 * Converts a base64 string to a JSON object.
 *
 * @param {string} base64 - The base64 string to be converted.
 * @returns {Object} The JSON object obtained from the base64 string.
 */
const base64ToJson = (base64) => {
	const str = decodeURIComponent(atob(base64));
	const json = JSON.parse(str);
	return json;
};

/**
 * Converts a URL-safe base64 string to a Uint8Array.
 *
 * @param {string} base64String - The URL-safe base64 string to be converted.
 * @returns {Uint8Array} The Uint8Array obtained from the base64 string.
 */
const urlBase64ToUint8Array = (base64String) => {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, '+')
		.replace(/_/g, '/');

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

/**
 * Saves data to the cache.
 *
 * @param {string} data - The data to be saved.
 * @returns {Promise<void>} A promise that resolves when the data has been stored.
 * @throws {Error} When the data cannot be stored.
 */
const saveToCache = async (data) => {
	try {
		const cache = await caches.open('swan-cache');
		await cache.put('/swanCredentials', new Response(data));
		console.log('Data stored successfully');
	} catch (error) {
		console.error('Failed to store data:', error);
	}
};

/**
 * Removes data from the cache.
 *
 * @returns {Promise<void>} A promise that resolves when the data has been removed.
 * @throws {Error} When the data cannot be removed.
 */
const removeFromCache = async () => {
	try {
		const cache = await caches.open('swan-cache');
		await cache.delete('/swanCredentials');
		console.log('Data from Cache API removed successfully');
	} catch (error) {
		console.error('Failed to remove data:', error);
	}
};

/**
 * Checks if data is not already stored in cache, then stores it in cache from local storage.
 *
 * @async
 * @function
 * @returns {Promise<void>} - Returns a promise that resolves when the operation is complete.
 */
const syncCache = async () => {
	// Check if data is not already stored in cache, then store it in cache from local storage
	const cache = await caches.open('swan-cache');
	const request = await cache.match('/swanCredentials');
	if (!request) {
		const userDetails = window.localStorage.getItem('swanCredentials');
		if (userDetails) await saveToCache(userDetails);
	}
};

const swan = {
	app_name: 'Swan',
	app_id: '',
	subscribedToPush: false,
	trackingUrl: '{{TRACKING_URL}}',
	ecomEventUrl: '{{ECOM_EVENT_URL}}',

	// eslint-disable-next-line no-empty-function
	async serviceWorkerRegistration() {},

	getTrackingUrl() {
		return `${this.trackingUrl}/${this.app_id}`;
	},
	/**
	 * The initObj should have the following properties
	 * app_id      - REQUIRED - the app id of the client
	 * swPath      - REQUIRED - the path of the service worker file which can be downloaded by calling GET /api/websdk/script/serviceworker endpoint
	 * @param {{ app_id: string, app_version: string, swPath: string, client: string }} initObj
	 */
	async init(initObj) {
		this.app_id = initObj.app_id;
		if (initObj.swPath) {
			if (!('serviceWorker' in navigator)) {
				throw new Error('No Service Worker support!');
			}
			if (!('PushManager' in window)) {
				throw new Error('No Push API Support!');
			}
			await requestNotificationPermission();
			try {
				this.serviceWorkerRegistration = await navigator.serviceWorker.register(
					initObj.swPath
				);

				await syncCache();
			} catch (err) {
				console.log(`${this.app_name}-service worker path not found`);
			}

			this.subscribedToPush = true;
		}
	},
	/**
	 * This object would have all the ecom events that are being tracked by the sdk.
	 * Any new events should be added here.
	 */
	ECOM_EVENTS: Object.freeze({
		USER_LOGOUT: 'userLogout',
		USER_LOGIN: 'userLogin',
		FORGOT_PASSWORD: 'forgotPassword',
		SEARCH: 'search',
		PRODUCT_VIEWED: 'productViewed',
		PRODUCT_CLICKED: 'productClicked',
		PRODUCT_LIST_VIEWED: 'productListViewed',
		PRODUCT_ADDED_TO_ADD_TO_CART: 'productAddedToaddTocart',
		PRODUCT_REMOVED_FROM_ADD_TO_CART: 'productRemovedFromAddToCart',
		SELECT_CATEGORY: 'selectCategory',
		CATEGORY_VIEWED_PAGE: 'categoryViewedPage',
		PRODUCT_ADDED_TO_WISHLIST: 'productAddedToWishlist',
		PRODUCT_REMOVED_FROM_WISHLIST: 'productRemovedFromWishlist',
		PRODUCT_RATED_OR_REVIEWED: 'productRatedOrReviewed',
		CART_VIEWED: 'cartViewed',
		OFFER_AVAILED: 'offerAvailed',
		CHECKOUT_STARTED: 'checkoutStarted',
		CHECKOUT_COMPLETED: 'checkoutCompleted',
		CHECKOUT_CANCELED: 'checkoutCanceled',
		PAYMENT_INFO_ENTERED: 'paymentInfoEntered',
		ORDER_COMPLETED: 'orderCompleted',
		ORDER_REFUNDED: 'orderRefunded',
		ORDER_CANCELLED: 'orderCancelled',
		ORDER_EXPERIANCE_RATING: 'orderExperianceRating',
		PRODUCT_REVIEW: 'productReview',
		PURCHASED: 'purchased',
		APP_UPDATED: 'appUpdated',
		ACCOUNT_DELETION: 'accountDeletion',
		SHARE: 'share',
		SCREEN: 'screen',
		WISHLIST_PRODUCT_ADDED_TO_CART: 'wishlistProductAddedToCart',
		SHIPPED: 'shipped',
		PRODUCT_QUANTITY_SELECTED: 'productQuantitySelected',
	}),
	/**
	 * This function is used internally to get the ecom event track url
	 */
	getEcomEventTrackUrl() {
		return `${this.ecomEventUrl}?appId=${this.app_id}`;
	},
	/**
	 * This function is used internally to get the device brand for the ecom events data
	 */
	getDeviceBrand() {
		const { userAgent } = navigator;
		if (userAgent.match(/iPhone/i)) {
			return 'Apple';
		}
		if (userAgent.match(/iPad/i)) {
			return 'Apple';
		}
		if (userAgent.match(/Android/i)) {
			// Extract Android device brand from user agent
			return userAgent.match(/Android\s([^;]+)/i)[1];
		}
		if (userAgent.match(/Macintosh/i)) {
			return 'Apple';
		}
		if (userAgent.match(/Windows/i)) {
			return 'Microsoft';
		}
		if (userAgent.match(/Linux/i)) {
			return 'Linux';
		}
		return 'unknown';
	},
	/**
	 * This function is used internally to get the device model for the ecom events data
	 */
	getDeviceModel() {
		const { userAgent } = navigator;
		if (userAgent.match(/iPhone/i)) {
			return userAgent.match(/iPhone\s([^;]+)/i)[1];
		}
		if (userAgent.match(/iPad/i)) {
			return userAgent.match(/iPad\s([^;]+)/i)[1];
		}
		if (userAgent.match(/Android/i)) {
			return userAgent.match(/Android\s([^;]+)/i)[1];
		}
		if (userAgent.match(/Macintosh/i)) {
			return 'Mac';
		}
		if (userAgent.match(/Windows/i)) {
			return 'Windows PC/Laptop';
		}
		if (userAgent.match(/Linux/i)) {
			return 'Linux PC/Laptop';
		}
		return 'unknown';
	},
	/**
	 * This function is used internally to get the os for the ecom events data
	 */
	getOsModel() {
		const platform = navigator.platform.toLowerCase();

		if (platform.includes('win')) {
			return 'Windows';
		}
		if (platform.includes('mac')) {
			return 'Mac OS';
		}
		if (platform.includes('linux')) {
			return 'Linux';
		}
		if (platform.includes('android')) {
			return 'Android';
		}
		if (
			platform.includes('iphone') ||
			platform.includes('ipad') ||
			platform.includes('ipod')
		) {
			return 'iOS';
		}
		return 'unknown';
	},
	/**
	 * This function is used internally to get the userId of the logged in user for the ecom events data
	 */
	getUserId() {
		return window.localStorage.getItem('swan_userId') || '';
	},
	// login with mobile or email
	async login(val) {
		const data = {
			eventType: 'login',
			eventData: {
				loginData: val,
				appId: this.app_id,
			},
		};

		if (this.subscribedToPush) {
			this.serviceWorkerRegistration.pushManager
				.getSubscription()
				.then((subscription) => {
					if (subscription) {
						data.eventData.webPushSubDetails = subscription.toJSON();
					}
					sendToSwan(this.getTrackingUrl(), data);
				})
				.catch((err) => {
					console.log(
						`${this.app_name}-err while fetching subscription details`,
						err
					);
				});
			return;
		}
		sendToSwan(this.getTrackingUrl(), data);
	},
	/**
	 * This function is used internally to track the ecom events from the exposed functions
	 * @param { ECOM_EVENTS } eventName
	 * @param { any } eventData
	 */
	trackEvent(eventName, eventData) {
		// construct the payload for the ecom event
		const payload = {
			userId: this.getUserId(),
			name: eventName,
			data: eventData,
		};

		payload.data.platform = 'web';
		payload.data.appVersion = '{{SDK_VERSION}}';
		payload.data.osModal = this.getOsModel();
		payload.data.deviceModal = this.getDeviceModel();
		payload.data.deviceBrand = this.getDeviceBrand();

		// send ecom event to server
		const xhr = new XMLHttpRequest();
		xhr.open('POST', this.getEcomEventTrackUrl(), true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.send(JSON.stringify(payload));
	},
	/**
	 * This function should be called for ecom along with the login function
	 * @param { { userId: string } } data
	 */
	userLogin(data) {
		const timeOfLogin = new Date();
		window.localStorage.setItem('swan_userId', data.userId);
		window.localStorage.setItem('swan_timeOfLogin', timeOfLogin);
		this.trackEvent(this.ECOM_EVENTS.USER_LOGIN, { timeOfLogin });
	},
	/**
	 * This function should be called by the client when the user logs out
	 */
	userLogout() {
		const timeOfLogin =
			window.localStorage.getItem('swan_timeOfLogin') || new Date();
		this.trackEvent(this.ECOM_EVENTS.USER_LOGOUT, {
			timeOfLogin,
			sdkVersion: '{{SDK_VERSION}}',
			osModal: this.getOsModel(),
			deviceModal: this.getDeviceModel(),
		});
		window.localStorage.removeItem('swan_userId');
		window.localStorage.removeItem('swan_timeOfLogin');
		window.localStorage.removeItem('swan_client');
	},
	/**
	 * @param { { success: bool } } data
	 */
	forgotPassword(data) {
		this.trackEvent(this.ECOM_EVENTS.FORGOT_PASSWORD, data);
	},
	/**
	 * @param { { searchKeyword: string } } data
	 */
	search(data) {
		this.trackEvent(this.ECOM_EVENTS.SEARCH, {
			...data,
			deviceModel: this.getDeviceModel(),
			deviceBrand: this.getDeviceBrand(),
		});
	},
	/**
	 * @param { { productId: string, productName: string, productCategory: string, productBrand: string, size: string, colour: string, productPrice: string } } data
	 */
	productViewed(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_VIEWED, {
			...data,
			deviceModel: this.getDeviceModel(),
			deviceBrand: this.getDeviceBrand(),
		});
	},
	/**
	 * @param { { productId: string, productName: string, productCategory: string, productBrand: string, productPrice: string, timeStand: Date, country: string } } data
	 */
	productClicked(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_CLICKED, {
			...data,
			deviceModel: this.getDeviceModel(),
			deviceBrand: this.getDeviceBrand(),
		});
	},
	/**
	 * @param { { productId: string, productName: string, sku: string, category: string, price: string, url: string } } data
	 */
	productListViewed(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_LIST_VIEWED, data);
	},
	/**
	 * This function is used to track the product added to cart event
	 * This also stores the cart items in local storage so that the data can be used later if needed by other events
	 * @param { { productId: string, productName: string, quantity: string, price: string, wighted: string, weightedQuantity: string } } data
	 */
	productAddedToAddTocart(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_ADDED_TO_ADD_TO_CART, data);
		const cart = JSON.parse(window.localStorage.getItem('cart')) || [];
		cart.push({
			...data,
			timeAddedToCart: new Date(),
		});
		window.localStorage.setItem('cart', JSON.stringify(cart));
	},
	/**
	 * This function is used to track the product removed from cart event
	 * This also removes the cart items in local storage added by the productAddedToAddTocart function
	 * @param { { productId: string, productName: string, quantity: string, price: string, wighted: string, weightedQuantity: string } } data
	 */
	productRemovedFromAddToCart(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_REMOVED_FROM_ADD_TO_CART, data);
		const cart = JSON.parse(window.localStorage.getItem('swan_cart')) || [];
		const newCart = cart.filter((item) => item.productId !== data.productId);
		window.localStorage.setItem('swan_cart', JSON.stringify(newCart));
	},
	/**
	 * @param { { categoryId: string, categoryName: string } } data
	 */
	selectCategory(data) {
		this.trackEvent(this.ECOM_EVENTS.SELECT_CATEGORY, data);
	},
	/**
	 * @param { { categoryId: string, categoryName: string, pageType: string, productList: any[] } } data
	 */
	categoryViewedPage(data) {
		this.trackEvent(this.ECOM_EVENTS.CATEGORY_VIEWED_PAGE, data);
	},
	/**
	 * This function is used to track the product added to wishlist event
	 * This also stores the wishlist items in local storage so that the data can be used later if needed by other events
	 * @param { { productId: string, productName: string, quantity: string, size: string, price: string } } data
	 */
	productAddedToWishlist(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_ADDED_TO_WISHLIST, data);
		const wishlist =
			JSON.parse(window.localStorage.getItem('swan_wishlist')) || [];
		wishlist.push({
			...data,
			timeAddedToWishlist: new Date(),
		});
		window.localStorage.setItem('swan_wishlist', JSON.stringify(wishlist));
	},
	/**
	 * This function is used to track the product added to wishlist event
	 * This also removes the wishlist items in local storage added by the productAddedToWishlist function
	 * @param { { productId: string, productName: string, quantity: string, size: string, price: string } } data
	 */
	productRemovedFromWishlist(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_REMOVED_FROM_WISHLIST, data);
		const wishlist =
			JSON.parse(window.localStorage.getItem('swan_wishlist')) || [];
		const newWishlist = wishlist.filter(
			(item) => item.productId !== data.productId
		);
		window.localStorage.setItem('swan_wishlist', JSON.stringify(newWishlist));
	},
	/**
	 * @param { { productId: string, productCategory: string, extraNote: string, rateValue: string, rateSubjectId: string } } data
	 */
	productRatedOrReviewed(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_RATED_OR_REVIEWED, data);
	},
	/**
	 * @param { { cartItems: any[], totalPrice: string, timeStamp: Date, numberOfItems: number } } data
	 */
	cartViewed(data) {
		this.trackEvent(this.ECOM_EVENTS.CART_VIEWED, data);
	},
	/**
	 * @param { { couponCode: string, orderId: string, expiryDate: Date } } data
	 */
	offerAvailed(data) {
		this.trackEvent(this.ECOM_EVENTS.OFFER_AVAILED, data);
	},
	/**
	 * @param { { checkoutId: string, orderId: string, items: any[], totalAmount: string, couponCode: string } } data
	 */
	checkoutStarted(data) {
		this.trackEvent(this.ECOM_EVENTS.CHECKOUT_STARTED, data);
	},
	/**
	 * @param { { checkoutId: string, orderId: string, totalAmount: string, checkoutDuration: string } } data
	 */
	checkoutCompleted(data) {
		this.trackEvent(this.ECOM_EVENTS.CHECKOUT_COMPLETED, data);
	},
	/**
	 * @param { { orderId: string, cancel: boolean } } data
	 */
	checkoutCanceled(data) {
		this.trackEvent(this.ECOM_EVENTS.CHECKOUT_CANCELED, data);
	},
	/**
	 * @param { { currency: string, value: string, items: any[], paymentType: string } } data
	 */
	paymentInfoEntered(data) {
		this.trackEvent(this.ECOM_EVENTS.PAYMENT_INFO_ENTERED, data);
	},
	/**
	 * This function is used to track the order completed event
	 * This also removes the cart items in local storage added by the productAddedToAddTocart function
	 * @param { { orderId: string, orderAmount: string, orderSuccessful } } data
	 */
	orderCompleted(data) {
		this.trackEvent(this.ECOM_EVENTS.ORDER_COMPLETED, data);
		window.localStorage.removeItem('swan_cart');
	},
	/**
	 * @param { { orderId: string, orderAmount: string, orderRefundId: string, reasonOfRefund: string } } data
	 */
	orderRefunded(data) {
		this.trackEvent(this.ECOM_EVENTS.ORDER_REFUNDED, data);
	},
	/**
	 * @param { { orderId: string, orderAmount: string, reasonForCancellation: string, originalPaymentMethod: string, productId: string } } data
	 */
	orderCancelled(data) {
		this.trackEvent(this.ECOM_EVENTS.ORDER_CANCELLED, {
			...data,
			userId: this.getUserId(),
		});
	},
	/**
	 * @param { { orderType: string, deliveryType: string, rateValue: string } } data
	 */
	orderExperianceRating(data) {
		this.trackEvent(this.ECOM_EVENTS.ORDER_EXPERIANCE_RATING, data);
	},
	/**
	 * @param { { productId: string, deliveryType: string, extraNote: string, rateValue: string, rateSubjectId: string } } data
	 */
	productReview(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_REVIEW, data);
	},
	/**
	 * @param { { orderId: string, brandId: string, sku: string, purchaseDate: string, orderCreatedDate: string } } data
	 */
	purchased(data) {
		this.trackEvent(this.ECOM_EVENTS.PURCHASED, data);
	},
	/**
	 * @param { { appVersion: string, timeOfUpdation: Date, updateType: string, previousVersion: string, updateID: string } } data
	 */
	appUpdated(data) {
		this.trackEvent(this.ECOM_EVENTS.APP_UPDATED, {
			...data,
			userId: this.getUserId(),
		});
	},
	/**
	 * @param { { apiCode: string, success: boolean, comment: string } } data
	 */
	accountDeletion(data) {
		this.trackEvent(this.ECOM_EVENTS.ACCOUNT_DELETION, data);
	},
	/**
	 * @param { { productId: string } } data
	 */
	share(data) {
		this.trackEvent(this.ECOM_EVENTS.SHARE, { itemId: data.productId });
	},
	/**
	 * @param { { screenName: string } } data
	 */
	screen(data) {
		this.trackEvent(this.ECOM_EVENTS.SCREEN, data);
	},
	/**
	 * @param { { wishlistId: string, productId: string, productName: string, category: string, qantity: string, price: string, size: string, brand: string, url: string } } data
	 */
	wishlistProductAddedToCart(data) {
		this.trackEvent(this.ECOM_EVENTS.WISHLIST_PRODUCT_ADDED_TO_CART, data);
	},
	/**
	 * @param { { productName: string, productCategory: string, productSubCategory: string, productId: string, sku: string, orderId: string, price: string, postalCode: string } } data
	 */
	shipped(data) {
		this.trackEvent(this.ECOM_EVENTS.SHIPPED, data);
	},
	/**
	 * @param { { productName: string, quantity: string, productId: string, productCategory: string } } data
	 */
	productQuantitySelected(data) {
		this.trackEvent(this.ECOM_EVENTS.PRODUCT_QUANTITY_SELECTED, data);
	},
	/**
	 * Logs in the user by saving user details to cache and local storage.
	 *
	 * @param {Object} credentials - The user's credentials.
	 * @returns {Promise<void>} A promise that resolves when the login process is complete.
	 */
	async onsiteLogin(credentials) {
		const userDetails = { credentials, appId: this.appId };
		const encodedUserDetails = jsonToBase64(userDetails);

		await saveToCache(encodedUserDetails);
		window.localStorage.setItem('swanCredentials', encodedUserDetails);

		// Send Message only when service worker is ready
		const registration = await navigator.serviceWorker.ready;
		if (registration) {
			console.log('inside fetch notification from api');
			registration.active.postMessage({
				purpose: 'fetch-notification-from-api',
				url: window.location.href,
			});
		}
	},

	/**
	 * Logs out the user by removing user details from cache and local storage.
	 * Also sends a 'logout' message to the service worker.
	 *
	 * @returns {Promise<void>} A promise that resolves when the logout process is complete.
	 */
	async onsiteLogout() {
		await removeFromCache();
		window.localStorage.removeItem('swanCredentials');

		const registration = await navigator.serviceWorker.ready;
		if (registration) {
			registration.active.postMessage({
				type: 'logout',
			});
		}
	},
};

/**
 * This function is used to show a modal notification in the center of the screen.
 * @param {Object} data - The data object containing various properties for the modal notification.
 * */
const showCenterModalNotification = (data) => {
	// Destructuring the data object to get the required properties.
	// Default value for isMobile is set to false.
	const {
		isMobile = false,
		title,
		description,
		imageUrl,
		fontFamily,
		titleColor,
		descriptionColor,
		primaryButtonBackground,
		primaryButtonFontColor,
		secondaryButtonBackground,
		secondaryButtonFontColor,
		themeBackground,
		crossButtonColor,
		primaryButtonLabel,
		primaryButtonAction,
		primaryButtonSwitch,
		secondaryButtonLabel,
		secondaryButtonAction,
		secondaryButtonSwitch,
		CDID,
		commId,
	} = data;

	// Logging the data for debugging purposes.
	console.log('modal data', data);

	// Creating a container div and setting its style attributes.
	const container = document.createElement('div');
	container.setAttribute(
		'style',
		`z-index:10000;display:flex;justify-content:center;align-items:center;height:100%;background-color:rgba(0, 0, 0, 0.3);font-family: ${fontFamily};position:fixed;top:0;left:0;width:100%;z-index:10000;`
	);

	// Creating a card div and setting its style attributes.
	const card = document.createElement('div');
	card.setAttribute(
		'style',
		`padding:1.5rem;width:21rem;background-color:${themeBackground};position:relative`
	);
	// If the device is mobile, adjust the margin of the card.
	if (isMobile) {
		card.setAttribute(
			'style',
			`padding:1.5rem;width:21rem;background-color:${themeBackground};position:relative;margin:1.5rem`
		);
	}
	// Appending the card to the container.
	container.appendChild(card);

	// Creating a cross div and setting its style attributes.
	const cross = document.createElement('div');
	cross.setAttribute(
		'style',
		`position:absolute;top:-0.8rem;right:-0.8rem;color:${crossButtonColor};cursor:pointer;`
	);

	// Setting the innerHTML of the cross div to an SVG.
	cross.innerHTML =
		'  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 16 16" width="25" height="25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"> <path d="m10.25 5.75-4.5 4.5m0-4.5 4.5 4.5"/> <circle cx="8" cy="8" r="6.25"/> </svg>';

	// Appending the cross to the card.
	card.appendChild(cross);
	// Adding an event listener to the cross. On click, the container's display is set to none.
	cross.addEventListener(
		'click',
		() => {
			container.setAttribute('style', 'display:none;');
		},
		false
	);

	// If an imageUrl is provided, create an imageContainer div and append an image to it.
	if (imageUrl) {
		const imageContainer = document.createElement('div');
		imageContainer.setAttribute('style', 'width:100%;height:10rem;');
		const image = document.createElement('img');
		image.setAttribute('src', `${imageUrl}`);
		image.setAttribute(
			'style',
			'width:inherit;height:inherit;object-fit:contain;'
		);
		imageContainer.appendChild(image);
		card.appendChild(imageContainer);
	}

	// Creating a titleContainer div and setting its style attributes.
	const titleContainer = document.createElement('div');
	titleContainer.setAttribute(
		'style',
		'display:flex;justify-content:center;margin-top:1rem;'
	);

	// If no imageUrl is provided, adjust the margin-top of the titleContainer.
	if (!imageUrl) {
		titleContainer.setAttribute(
			'style',
			'display:flex;justify-content:center;margin-top:0rem;'
		);
	}

	// Creating a titleSpan, setting its style attributes and innerHTML, and appending it to the titleContainer.
	const titleSpan = document.createElement('span');
	titleSpan.setAttribute(
		'style',
		`display:inline-block;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;max-width: 18ch;font-size:1.4rem;font-weight:500;color: ${titleColor}`
	);
	titleSpan.innerHTML = title;
	titleContainer.appendChild(titleSpan);
	card.appendChild(titleContainer);

	// If a description is provided, create a descriptionContainer div and append a descriptionSpan to it.
	if (description) {
		const descriptionContainer = document.createElement('div');
		descriptionContainer.setAttribute(
			'style',
			'display:flex;justify-content:center;margin-top:0.5rem;'
		);
		const descriptionSpan = document.createElement('span');
		descriptionSpan.setAttribute(
			'style',
			`line-height: 1.4;word-wrap: break-word;text-overflow: ellipsis;overflow: hidden;display: -webkit-box;-webkit-line-clamp: 3;-webkit-box-orient: vertical;font-size:1.1rem;font-weight:400;text-align:center;color:${descriptionColor}`
		);
		descriptionSpan.innerHTML = description;
		descriptionContainer.appendChild(descriptionSpan);
		card.appendChild(descriptionContainer);
	}

	// If either primaryButtonSwitch or secondaryButtonSwitch is true, create a buttonContainer div and append the necessary buttons to it.
	if (primaryButtonSwitch || secondaryButtonSwitch) {
		const buttonContainer = document.createElement('div');
		buttonContainer.setAttribute(
			'style',
			'margin-top:1.5rem;display:flex;justify-content:space-between'
		);

		// If primaryButtonSwitch is true, create a primaryButton and append it to the buttonContainer.
		if (primaryButtonSwitch) {
			const primaryButton = document.createElement('a');
			primaryButton.setAttribute(
				'style',
				`text-decoration:none;padding:0.8rem;height:1rem;width:100%;background-color:${primaryButtonBackground};color:${primaryButtonFontColor}`
			);
			primaryButton.setAttribute('href', `${primaryButtonAction}`);
			primaryButton.setAttribute('target', '_blank');
			const primaryButtonSpan = document.createElement('span');
			primaryButtonSpan.setAttribute(
				'style',
				'display:flex;justify-content:center'
			);
			primaryButtonSpan.innerHTML = primaryButtonLabel;

			// Adding an event listener to the primaryButton. On click, the container's display is set to none.
			primaryButton.addEventListener(
				'click',
				async () => {
					container.setAttribute('style', 'display:none;');

					// Send Message only when service worker is ready
					const registration = await navigator.serviceWorker.ready;
					if (registration) {
						registration.active.postMessage({
							purpose: 'send-ack-to-api',
							CDID,
							commId,
							event: 'clicked',
						});
					}
				},
				false
			);
			primaryButton.appendChild(primaryButtonSpan);
			buttonContainer.appendChild(primaryButton);
		}

		// If secondaryButtonSwitch is true, create a secondaryButton and append it to the buttonContainer.
		if (secondaryButtonSwitch) {
			const secondaryButton = document.createElement('a');
			secondaryButton.setAttribute(
				'style',
				`text-decoration:none;padding:0.8rem;height:1rem;width:100%;margin-left:20px;background-color:${secondaryButtonBackground};color:${secondaryButtonFontColor};`
			);
			secondaryButton.setAttribute('href', `${secondaryButtonAction}`);
			secondaryButton.setAttribute('target', '_blank');
			secondaryButton.addEventListener(
				'click',
				async () => {
					container.setAttribute('style', 'display:none;');

					// Send Message only when service worker is ready
					const registration = await navigator.serviceWorker.ready;
					if (registration) {
						registration.active.postMessage({
							purpose: 'send-ack-to-api',
							CDID,
							commId,
							event: 'clicked',
						});
					}
				},
				false
			);

			const secondaryButtonSpan = document.createElement('span');
			secondaryButtonSpan.setAttribute(
				'style',
				'display:flex;justify-content:center'
			);
			secondaryButtonSpan.innerHTML = secondaryButtonLabel;
			secondaryButton.appendChild(secondaryButtonSpan);
			buttonContainer.appendChild(secondaryButton);
		}

		card.appendChild(buttonContainer);
	}

	// Appending the container to the body of the document.
	document.body.appendChild(container);
};

/**
 * This function is used to show a header notification.
 * @param {Object} data - The data object containing various properties for the header notification.
 * */
const showHeaderNotification = (data) => {
	console.log('in header notification');

	// Get the body element
	const { body } = document;

	// Get the computed font size of the body in pixels
	const bodyFontSize = parseFloat(
		window.getComputedStyle(body, null).getPropertyValue('font-size')
	);

	// Get the current padding-top value in pixels and convert it to rem
	const currentPaddingTopInPx = parseFloat(
		window.getComputedStyle(body, null).getPropertyValue('padding-top')
	);
	const currentPaddingTopInRem = currentPaddingTopInPx / bodyFontSize;

	console.log('currentPaddingTopInRem', currentPaddingTopInRem);

	// Calculate the new padding-top value
	const newPaddingTop = currentPaddingTopInRem + 4; // Adding 4rem

	// Set the new padding-top value
	body.style.paddingTop = `${newPaddingTop}rem`;

	console.log('newPaddingTop', newPaddingTop);

	// Destructuring the data object to get the required properties.
	// Default value for isMobile is set to false.
	const {
		isMobile = false,
		description,
		imageUrl,
		fontFamily,
		descriptionColor,
		primaryButtonBackground,
		primaryButtonFontColor,
		themeBackground,
		crossButtonColor,
		primaryButtonLabel,
		primaryButtonAction,
		primaryButtonSwitch,
	} = data;

	// Creating a container div and setting its style attributes.
	const container = document.createElement('div');
	container.setAttribute(
		'style',
		`position: fixed;top:0rem;left:0rem;width:100%;z-index:10000;font-family: ${fontFamily};`
	);

	// Creating a card div and setting its style attributes.
	const card = document.createElement('div');
	card.setAttribute(
		'style',
		`padding:.5rem;position:relative;display:flex;align-items:center;background-color:${themeBackground}`
	);
	container.appendChild(card);

	// If an imageUrl is provided, create an imageContainer div and append an image to it.
	if (imageUrl) {
		const imageContainer = document.createElement('div');
		imageContainer.setAttribute('style', 'width:6rem;height:2.5rem;');

		if (isMobile) {
			imageContainer.setAttribute('style', 'width:4rem;height:2rem');
		}

		const image = document.createElement('img');
		image.setAttribute('src', `${imageUrl}`);
		image.setAttribute(
			'style',
			'width:inherit;height:inherit;object-fit:contain;'
		);
		imageContainer.appendChild(image);
		card.appendChild(imageContainer);
	}

	// Creating a descriptionContainer div and setting its style attributes.
	const descriptionContainer = document.createElement('div');
	descriptionContainer.setAttribute(
		'style',
		'display:flex;justify-content:start;max-width:70%;margin-left:3rem;margin-right:3rem;'
	);

	if (isMobile) {
		descriptionContainer.setAttribute(
			'style',
			'display:flex;justify-content:start;max-width:70%;margin-left:1rem;margin-right:1rem;'
		);
	}

	// Creating a descriptionSpan, setting its style attributes and innerHTML, and appending it to the descriptionContainer.
	const descriptionSpan = document.createElement('span');
	descriptionSpan.setAttribute(
		'style',
		` line-height: 1.4;
				 word-wrap: break-word;
				 text-overflow: ellipsis;
				 overflow: hidden;
				 display: -webkit-box;
				 -webkit-line-clamp: 2;
				 -webkit-box-orient: vertical;
				 font-size:1rem;
				 font-weight:400;
				 text-align:left;color:${descriptionColor}`
	);
	descriptionSpan.innerHTML = description;
	descriptionContainer.appendChild(descriptionSpan);
	card.appendChild(descriptionContainer);

	// If primaryButtonSwitch is true, create a buttonContainer div and append a primaryButton to it.
	if (primaryButtonSwitch) {
		const buttonContainer = document.createElement('div');
		buttonContainer.setAttribute(
			'style',
			'display:flex;justify-content:space-between'
		);

		const primaryButton = document.createElement('a');
		primaryButton.setAttribute(
			'style',
			`text-decoration:none;padding:0.3rem 0.7rem;background-color:${primaryButtonBackground};color:${primaryButtonFontColor}`
		);

		if (isMobile) {
			primaryButton.setAttribute(
				'style',
				`text-decoration:none;padding:0.3rem 0.5rem;background-color:${primaryButtonBackground};color:${primaryButtonFontColor};margin-right:0.5rem;`
			);
		}

		primaryButton.setAttribute('href', `${primaryButtonAction}`);
		primaryButton.setAttribute('target', '_blank');
		const primaryButtonSpan = document.createElement('span');
		primaryButtonSpan.setAttribute(
			'style',
			'display:flex;justify-content:center'
		);
		primaryButtonSpan.innerHTML = primaryButtonLabel;

		// Adding an event listener to the primaryButton. On click, the container's display is set to none and the padding-top of the body is adjusted.
		primaryButton.addEventListener(
			'click',
			async () => {
				container.setAttribute('style', 'display:none;');

				// Get the current padding-top value in pixels and convert it to rem
				const currentPaddingTopInPx2 = parseFloat(
					window.getComputedStyle(body, null).getPropertyValue('padding-top')
				);
				const currentPaddingTopInRem2 = currentPaddingTopInPx2 / bodyFontSize;

				// Calculate the new padding-top value
				const newPaddingTop2 = currentPaddingTopInRem2 - 4; // subtracting 4rem

				// Set the new padding-top value
				body.style.paddingTop = `${newPaddingTop2}rem`;

				// Send Message only when service worker is ready
				const registration = await navigator.serviceWorker.ready;
				if (registration) {
					registration.active.postMessage({
						purpose: 'send-ack-to-api',
						CDID,
						commId,
						event: 'clicked',
					});
				}
			},
			false
		);
		primaryButton.appendChild(primaryButtonSpan);
		buttonContainer.appendChild(primaryButton);

		card.appendChild(buttonContainer);
	}

	// Creating a cross div and setting its style attributes.
	const cross = document.createElement('div');
	cross.setAttribute(
		'style',
		`cursor:pointer;margin-left:auto;margin-right:0.5rem;color:${crossButtonColor};`
	);

	cross.innerHTML =
		'  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 16 16" width="25" height="25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"> <path d="m10.25 5.75-4.5 4.5m0-4.5 4.5 4.5"/> <circle cx="8" cy="8" r="6.25"/> </svg>';

	card.appendChild(cross);
	// Adding an event listener to the cross. On click, the container's display is set to none and the padding-top of the body is adjusted.
	cross.addEventListener(
		'click',
		() => {
			container.setAttribute('style', 'display:none;');

			console.log(
				"window.getComputedStyle(body, null).getPropertyValue('padding-top')",
				window.getComputedStyle(body, null).getPropertyValue('padding-top')
			);

			// Get the current padding-top value in pixels and convert it to rem
			const currentPaddingTopInPx2 = parseFloat(
				window.getComputedStyle(body, null).getPropertyValue('padding-top')
			);
			const currentPaddingTopInRem2 = currentPaddingTopInPx2 / bodyFontSize;

			// Calculate the new padding-top value
			const newPaddingTop2 = currentPaddingTopInRem2 - 4; // subtracting 4rem // Adding 4rem

			// Set the new padding-top value
			body.style.paddingTop = `${newPaddingTop2}rem`;
		},
		false
	);

	// Appending the container to the body of the document.
	document.body.appendChild(container);
};

// Add an event listener for the 'load' event on the window object.
// The 'load' event is fired when the whole page has loaded, including all dependent resources such as stylesheets and images.
window.addEventListener('load', async () => {
	// This is the callback function that gets executed when the 'load' event is fired.
	// At this point, all resources (including CSS, images, etc.) have finished loading.

	console.log('On window load');

	// Post a message to the service worker controlling this page.
	// The 'postMessage' method allows you to send a message (in the form of a JavaScript object) to the service worker.
	// In this case, the message has a 'purpose' property with the value 'fetch-notification-from-indexed-db'.
	// This could be used by the service worker to determine what action to take upon receiving the message.
	await syncCache();

	// Send Message only when service worker is ready
	const registration = await navigator.serviceWorker.ready;
	if (registration) {
		registration.active.postMessage({
			purpose: 'fetch-notification-from-api',
			url: window.location.href,
		});

		registration.active.postMessage({
			purpose: 'fetch-notification-from-indexed-db',
			url: window.location.href,
		});
	}
});

/**
 * This function is an event listener for the 'message' event on the service worker.
 * The 'message' event is fired when a message is received from the service worker.
 * @param {Object} event - The event object containing data about the event.
 */
navigator.serviceWorker.addEventListener('message', (event) => {
	// This is the callback function that gets executed when the 'message' event is fired.

	// Log the received message to the console for debugging purposes.
	console.log('Message received from service worker:', event.data);

	// Destructure the 'purpose' and 'data' properties from the received message.
	const { purpose, data } = event.data;

	// If the 'purpose' is not 'show-on-site-notification', return early.
	if (purpose !== 'show-on-site-notification') {
		return;
	}

	// If 'data' is not provided, return early.
	if (!data) {
		return;
	}

	// Log the notification data for debugging purposes.
	console.log('notification', data);

	if (
		data.displayIn &&
		data.displayIn !== 'all' &&
		!window.location.href.includes(data.displayIn)
	) {
		return;
	}

	// Destructure the 'subType', 'design', and 'displayIn' properties from the notification data.
	const { subType, design, commId, CDID } = data;

	// Destructure the 'title', 'description', 'imageUrl', 'fontFamily', 'colors', and 'buttons' properties from the design.
	const { title, description, imageUrl, fontFamily, colors, buttons } = design;

	// Destructure the color properties from the colors.
	const {
		title: titleColor,
		description: descriptionColor,
		primaryButtonBackground,
		primaryButtonFont: primaryButtonFontColor,
		secondaryButtonBackground,
		secondaryButtonFont: secondaryButtonFontColor,
		themeBackground,
		crossButton: crossButtonColor,
	} = colors;

	// Get the primary and secondary button configurations.
	const primaryButtonConfig = buttons[0];
	const secondaryButtonConfig = buttons[1];

	// Destructure the 'label', 'action', and 'primaryButtonSwitch' properties from the primary button configuration.
	const {
		label: primaryButtonLabel,
		action: primaryButtonAction,
		primaryButtonSwitch,
	} = primaryButtonConfig;

	// Destructure the 'label', 'action', and 'secondaryButtonSwitch' properties from the secondary button configuration.
	const {
		label: secondaryButtonLabel,
		action: secondaryButtonAction,
		secondaryButtonSwitch,
	} = secondaryButtonConfig;

	// Initialize a variable to hold whether the device is mobile.
	let isMobile = false;

	// Create a media query that targets viewports at most 500px wide.
	const mediaQuery = window.matchMedia('(max-width: 500px)');

	// If the media query matches, set 'isMobile' to true.
	if (mediaQuery.matches) {
		isMobile = true;
	}

	// Create the notification payload.
	const notificationPayload = {
		isMobile,
		title,
		description,
		imageUrl,
		fontFamily,
		titleColor,
		descriptionColor,
		primaryButtonBackground,
		primaryButtonFontColor,
		secondaryButtonBackground,
		secondaryButtonFontColor,
		themeBackground,
		crossButtonColor,
		primaryButtonLabel,
		primaryButtonAction,
		primaryButtonSwitch,
		secondaryButtonLabel,
		secondaryButtonAction,
		secondaryButtonSwitch,
		commId,
		CDID,
	};

	// Depending on the 'subType', call the appropriate function with the notification payload.
	switch (subType) {
		case 'popup':
			showCenterModalNotification(notificationPayload);
			break;
		case 'header':
			showHeaderNotification(notificationPayload);
			break;
	}
});

// eslint-disable-next-line no-underscore-dangle
window._swan = swan;
