# timelapper

1. **ESP32-CAM** records images and saves to **Firebase RTDB**

2. Every midnight, **Firebase Cloud Functions**:
    - gathers images
    - processes them 
    - saves to GDrive / posts on YouTube / puts on Facebook / sends in Discord
    - deletes existing images to save space

3. Repeat :D