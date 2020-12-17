# timelapper

1. **ESP32-CAM** records images and saves to **Firebase RTDB**

2. Every midnight, **Firebase Cloud Functions**:
    - gathers images
    - processes them 
    - saves to GDrive / posts on YouTube / puts on Facebook / sends in Discord
    - deletes existing images to save space

3. Repeat :D


# Setup
Create a `src/credentials.h` file and add the following into the file:
```c
#ifndef CREDENTIALS_H
#define CREDENTIALS_H

#define WIFI_SSID "wifi"
#define WIFI_PASS "pass"
#define FIREBASE_HOST "xxxxxxxxxx.firebaseio.com"
#define FIREBASE_AUTH "averyhighentropysecretthing"
#define AP_SSID "wifiofyouresp"
#define AP_PASS "passofyouresp" //AP password require at least 8 characters.

#endif
```