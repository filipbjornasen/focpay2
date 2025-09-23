cd client
npm install
npm run build
cd ..
rmdir deploy
mkdir deploy
del deploy.zip
cd server
npm install
cd ..
xcopy .\server\* .\deploy /E /H /Y /I
# compress manually all files in deploy to zip, make sure the zip is not nested in a folder so that index.js is immediatly present
cd deploy
az webapp deployment source config-zip --resource-group focpay2-rg --name focpay2 --src deploy.zip