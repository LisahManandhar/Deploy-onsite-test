/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
// Define the endpoints for fetching notifications and acknowledging them
const onSiteNotificationsEndpoint =
	'https://swan-web-sdk.azurewebsites.net/api/post-on-site-notification-to-sdk';

const onSiteAckEndpoint =
	'https://swan-web-sdk.azurewebsites.net/api/post-on-site-notification-sdk-ack';

/**
 * Object for managing the IndexedDB database for on-site notifications.
 *
 * @namespace IDBSwan
 */
const IDBSwan = {
	dbInstance: null,
	dbName: 'on-site-db',
	storeName: 'on-site-notifications',

	/**
	 * Gets the current database instance, or creates a new one if it doesn't exist.
	 *
	 * @returns {Promise<IDBDatabase>} The database instance.
	 */
	async getDB() {
		if (this.dbInstance) return this.dbInstance;
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, 1);
			request.onerror = () => reject(request.error);
			// Creating the object store for the on-site notifications
			request.onupgradeneeded = () => {
				const db = request.result;

				const storeSetup = {
					name: this.storeName,
					options: { keyPath: 'commId' },
				};

				if (!db.objectStoreNames.contains(storeSetup.name)) {
					db.createObjectStore(storeSetup.name, storeSetup.options);
				}
			};

			request.onsuccess = () => {
				this.dbInstance = request.result;
				resolve(request.result);
			};
		});
	},

	/**
	 * Adds data to the object store.
	 *
	 * @param {Object} data - The data to add.
	 * @returns {Promise<void>} A promise that resolves when the data has been added.
	 */
	async upsertData(data) {
		const db = await this.getDB();
		const tx = db.transaction([this.storeName], 'readwrite');
		const store = tx.objectStore(this.storeName);
		store.put(data);

		return new Promise((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	},

	/**
	 * Closes the current database instance and deletes the database.
	 *
	 * @returns {Promise<void>} A promise that resolves when the database has been closed and deleted.
	 */
	async closeDB() {
		if (this.dbInstance) {
			this.dbInstance.close();
			this.dbInstance = null;
		}
		indexedDB.deleteDatabase(this.dbName);
	},

	/**
	 * Get all records from db for the store.
	 *
	 * @returns {Promise<void>} A promise that resolves when all the data has been fetched from db.
	 */
	async getAllRecordsFromDB() {
		const db = await this.getDB();
		const tx = db.transaction([this.storeName], 'readwrite');
		const store = tx.objectStore(this.storeName);
		const result = store.getAll();

		return new Promise((resolve, reject) => {
			tx.oncomplete = () => resolve(result.result);
			tx.onerror = () => reject(tx.error);
		});
	},

	/**
	 * Delete record from db based on key.
	 *
	 * @returns {Promise<void>} A promise that resolves when the data has been deleted from db.
	 */
	async deleteRecord(key) {
		const db = await this.getDB();
		const tx = db.transaction([this.storeName], 'readwrite');
		const store = tx.objectStore(this.storeName);
		store.delete(key);

		return new Promise((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	},
};

// urlB64ToUint8Array is a magic function that will encode the base64 public key
// to Array buffer which is needed by the subscription option
const urlB64ToUint8Array = (base64String) => {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, '+')
		.replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
};

const sendToSwan = (url, data) => {
	fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	}).catch((error) => {
		console.error(error);
	});
};

/**
 * Fetches data from Swan.
 *
 * @param {string} url - The URL to fetch data from.
 * @returns {Promise<Object>} A promise that resolves with the JSON response.
 * @throws {Error} When the request fails.
 */
const fetchFromSwan = async (url, query = {}) => {
	try {
		const params = new URLSearchParams(query);
		url = `${url}?${params.toString()}`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`request failed with status ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error fetching data from Swan:', error);
	}
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

const APP_SERVER_KEY = '{{APP_SERVER_KEY}}';
const APP_ID = '{{APP_ID}}';
const TRACKING_URL = `{{TRACKING_URL}}/${APP_ID}`;

self.addEventListener('install', (event) =>
	event.waitUntil(self.skipWaiting())
);
self.addEventListener('activate', async (event) => {
	event.waitUntil(self.clients.claim());
	// This will be called only once when the service worker is activated.
	try {
		const applicationServerKey = urlB64ToUint8Array(APP_SERVER_KEY);
		const options = { userVisibleOnly: true, applicationServerKey };
		await self.registration.pushManager.subscribe(options);
	} catch (err) {
		console.log('Error', err);
	}
});

self.addEventListener('push', (event) => {
	if (event.data) {
		const pushData = event.data.json();
		showLocalNotification(pushData, self.registration);
		const data = {
			eventType: 'webPushDelivered',
			eventData: {
				webhookEvent: {
					MessageSid: pushData.data.commId,
					MessageStatus: 'delivered', // delivered,click
					CDID: pushData.data.CDID,
				},
				appId: APP_ID,
			},
		};
		sendToSwan(TRACKING_URL, data);
	} else {
		console.log('Push event but no data');
	}
});

self.addEventListener('notificationclick', (event) => {
	switch (event.action) {
		case 'close': {
			break;
		}
		case 'button_click_1': {
			// eslint-disable-next-line no-restricted-syntax
			for (const actions of event.notification.actions) {
				const { action } = actions;
				if (action === event.action) {
					event.waitUntil(
						clients.openWindow(event.notification.data.button[action])
					);
				}
			}

			const data = {
				eventType: 'webPushClicked',
				eventData: {
					webhookEvent: {
						MessageSid: event.notification.data.commId,
						MessageStatus: 'click', // delivered,click
						CDID: event.notification.data.CDID,
					},
					appId: APP_ID,
				},
			};
			sendToSwan(TRACKING_URL, data);
			break;
		}
		case 'button_click_2': {
			// eslint-disable-next-line no-restricted-syntax
			for (const actions of event.notification.actions) {
				const { action } = actions;
				if (action === event.action) {
					event.waitUntil(
						clients.openWindow(event.notification.data.button[action])
					);
				}
			}

			const data = {
				eventType: 'webPushClicked',
				eventData: {
					webhookEvent: {
						MessageSid: event.notification.data.commId,
						MessageStatus: 'click', // delivered,click
						CDID: event.notification.data.CDID,
					},
					appId: APP_ID,
				},
			};
			sendToSwan(TRACKING_URL, data);
			break;
		}
		default: {
			if (event.notification.data.url) {
				event.waitUntil(clients.openWindow(event.notification.data.url));
			}

			const data = {
				eventType: 'webPushClicked',
				eventData: {
					webhookEvent: {
						MessageSid: event.notification.data.commId,
						MessageStatus: 'click', // delivered,click
						CDID: event.notification.data.CDID,
					},
					appId: APP_ID,
				},
			};
			sendToSwan(TRACKING_URL, data);
			break;
		}
	}
});

const showLocalNotification = (body, swRegistration) => {
	const options = {
		...body,
	};
	swRegistration.showNotification(options.title, options);
};

/**
 * Checks if credentials are an email or a mobile number.
 *
 * @param {string} credentials - The credentials to check.
 * @returns {('email'|'mobile'|null)} The type of credentials.
 */
const identifyCredentials = (credentials) => {
	const emailRegex = /\S+@\S+\.\S+/;
	const mobileCheck = credentials.replace(/\D/g, '');
	const mobileCondition = mobileCheck.length >= 10 && mobileCheck.length <= 15;

	if (emailRegex.test(credentials)) return 'email';
	else if (mobileCondition) return 'mobile';
	else return null;
};

/**
 * Event listener for 'message' events on the service worker.
 * If the message type is 'logout', it closes the IndexedDB database.
 *
 * @param {MessageEvent} event - The message event.
 * @returns {Promise<void>} A promise that resolves when the database has been closed.
 */
self.addEventListener('message', async (event) => {
	if (event.data.type !== 'logout') return;
	await IDBSwan.closeDB();
});

/**
 * Fetches notifications from Swan and stores them in IndexedDB.
 *
 * @returns {Promise<void>} A promise that resolves when the notifications have been fetched and stored.
 * @throws {Error} When the fetch request or the transaction fails.
 */
const fetchNotification = async () => {
	try {
		// Open the cache and get the credentials
		const cache = await caches.open('swan-cache');
		const request = await cache.match('/swanCredentials');
		if (!request) return;

		// Convert the base64 string to a JSON object
		const base64 = await request.text();
		const userDetails = base64ToJson(base64);

		// Identify the type of credentials
		const type = identifyCredentials(userDetails.credentials);
		if (!type) return;

		// Define the query parameters for the fetch request
		const query = { appId: 'swan-test_51793', [type]: userDetails.credentials };
		const response = await fetchFromSwan(onSiteNotificationsEndpoint, query);
		if (!response) return;

		// For each notification in the response, add it to the object store
		response.notifications.forEach(async (notification) => {
			await IDBSwan.upsertData(notification);

			// Sending an ACK (acknowledgement) to the swan server

			const body = {
				CDID: notification.CDID,
				commId: notification.commId,
				event: 'delivered',
			};

			await sendToSwan(onSiteAckEndpoint, body);
		});

		console.log('Notification response:', response);
	} catch (error) {
		console.error('Error fetching notification:', error);
	}
};

/**
 * Compares two URLs excluding query parameters and fragments.
 *
 * @param {string} url1 - The first URL to compare.
 * @param {string} url2 - The second URL to compare.
 * @returns {boolean} - Returns true if the protocol, hostname, and pathname of both URLs are the same, otherwise false.
 */
const getNotification = async (notifications, url) => {
	// Filter Notifications based on Expires at, Display Limit and Display In URL
	const filteredNotifications = notifications?.filter((notification) => {
		if (new Date(notification?.expiresAt) < Date?.now()) {
			IDBSwan.deleteRecord(notification?.commId);
			return false;
		}
		if (!notification?.displayUnlimited) {
			const displayCount = notification?.displayCount ?? 0;
			if (displayCount >= notification?.displayLimit) {
				IDBSwan.deleteRecord(notification?.commId);
				return false;
			}
		}

		if (
			notification?.displayIn &&
			notification?.displayIn !== 'all' &&
			!url.includes(notification?.displayIn)
		)
			return false;
		return true;
	});

	// Select Random Notification from Array
	const randomIndex = Math.floor(Math.random() * filteredNotifications.length);
	const notification = filteredNotifications[randomIndex];

	// Update Display Count if Display Limit is present while displaying the notification
	if (notification?.displayLimit) {
		notification.displayCount = notification.displayCount
			? notification.displayCount + 1
			: 1;
		await IDBSwan.upsertData(notification);
	}
	return notification;
};

// Add an event listener for the 'message' event on the service worker.
// The 'message' event is fired when a message is received from the main thread.
self.addEventListener('message', async (event) => {
	// This is the callback function that gets executed when the 'message' event is fired.

	// Destructure the 'purpose' and 'url' properties from the received message.
	const { purpose, url } = event.data;

	// If the 'purpose' is not 'fetch-notification-from-indexed-db', return early.
	if (purpose !== 'fetch-notification-from-indexed-db') {
		return;
	}

	// Fetch all records from the IndexedDB.
	const notifications = await IDBSwan.getAllRecordsFromDB();

	// If there are no notifications, return early.
	if (!notifications.length) return;

	// Log the notifications for debugging purposes.
	console.log('notifications', notifications);

	// Get the notification that matches the provided URL.
	const notification = await getNotification(notifications, url);

	// If no matching notification is found, return early.
	if (!notification) return;

	// Prepare the body for the acknowledgement request to the swan server.
	const body = {
		CDID: notification.CDID,
		commId: notification.commId,
		event: 'showed',
	};

	// Send an acknowledgement to the swan server.
	await sendToSwan(onSiteAckEndpoint, body);

	// Get all clients controlled by the service worker.
	self.clients.matchAll().then((clients) => {
		// For each client, post a message with the purpose 'show-on-site-notification' and the notification data.
		clients.forEach((client) => {
			client.postMessage({
				purpose: 'show-on-site-notification',
				data: notification,
			});
		});
	});
});

// Add an event listener for the 'message' event on the service worker.
// The 'message' event is fired when a message is received from the main thread.
self.addEventListener('message', async (event) => {
	// This is the callback function that gets executed when the 'message' event is fired.

	// Destructure the 'purpose' and 'url' properties from the received message.
	const { purpose, url } = event.data;

	// If the 'purpose' is not 'fetch-notification-from-api', return early.
	if (purpose !== 'fetch-notification-from-api') {
		return;
	}

	// Open the cache named 'swan-cache'.
	const cache = await caches.open('swan-cache');

	// Try to match a request in the cache for '/lastNotificationFetchTime'.
	const request = await cache.match('/lastNotificationFetchTime');

	// Initialize a variable to hold the last notification fetch time.
	let lastNotificationFetchTime = null;

	// If no matching request is found in the cache, put a new request in the cache with the current date as the response.
	// Otherwise, get the response text of the matching request (which is the last notification fetch time), and convert it to a Date object.
	if (!request) {
		await cache.put('/lastNotificationFetchTime', new Response(new Date()));
	} else {
		lastNotificationFetchTime = await request.text();
		lastNotificationFetchTime = new Date(lastNotificationFetchTime);
	}

	// Get the current date and time.
	const currentTime = new Date();

	// Check if the URL includes 'swanOnSiteNotificationTest=1'.
	const isOnsiteTest = url.includes('swanOnSiteNotificationTest=1');

	// If 'isOnsiteTest' is false, and 'lastNotificationFetchTime' is not null, and the difference between 'currentTime' and 'lastNotificationFetchTime' is less than 1 hour, return early.
	// Otherwise, fetch the notification.
	if (
		!isOnsiteTest &&
		lastNotificationFetchTime &&
		currentTime - lastNotificationFetchTime < 60 * 60 * 1000
	) {
		return;
	}
	await fetchNotification();
});

// Add an event listener for the 'message' event on the service worker.
// The 'message' event is fired when a message is received from the main thread.
self.addEventListener('message', async (event) => {
	// This is the callback function that gets executed when the 'message' event is fired.

	// Destructure the 'purpose', 'commId', 'CDID', and 'event' properties from the received message.
	const { purpose, commId, CDID, event: action } = event.data;

	// If the 'purpose' is not 'send-ack-to-api', return early.
	if (purpose !== 'send-ack-to-api') {
		return;
	}

	// Prepare the body for the acknowledgement request to the swan server.
	const body = {
		CDID,
		commId,
		event: action,
	};

	// Send an acknowledgement to the swan server.
	await sendToSwan(onSiteAckEndpoint, body);
});
