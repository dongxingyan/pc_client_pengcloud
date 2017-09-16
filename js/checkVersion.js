
const AutoUpdater = require( "nw-autoupdater" ),
            updater = new AutoUpdater( require( "../package.json" ) );

      async function main(){
        try {

           // Update copy is running to replace app with the update
          if ( updater.isSwapRequest() ) {

              var page = document.getElementById("homePage");
              var pageLoading=document.getElementById("loadingBox");

              page.style.display = "none";
              pageLoading.style.display="block";

              await updater.swap();

              await updater.restart();
            return;
          }

            // Download/unpack update if any available
          const rManifest = await updater.readRemoteManifest();
          const needsUpdate = await updater.checkNewVersion( rManifest );
          if ( !needsUpdate ) {
            return;
          }

          if (!confirm( $translate.instant('IDS_UPDATE_ALERT'))){
              return;
          }

          // Subscribe for progress events
          updater.on( "download", ( downloadSize, totalSize ) => {
            console.log( "download progress", Math.floor( downloadSize / totalSize * 100 ), "%" );
          });
          updater.on( "install", ( installFiles, totalFiles ) => {
            console.log( "install progress", Math.floor( installFiles / totalFiles * 100 ), "%" );
          });

          const updateFile = await updater.download( rManifest );
          await updater.unpack( updateFile );

          alert( $translate.instant('IDS_UPDATE_RESTART'));

          // await updater.restartToSwap();

        } catch ( e ) {
          console.error( e );
        }
      }

    setTimeout(function () {
        main();
    }, updater.isSwapRequest()?0:1000);

