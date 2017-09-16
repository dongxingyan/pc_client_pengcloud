const fs = require( "fs-extra" ),
      { spawn ,exec} = require( "child_process" ),
    iconv=require('iconv-lite')
/**
  * Remove trailing slash
  * @param {string} dir
  * @returns {string}
  */
function rtrim( dir )
{
  return dir.replace( /\/$/, "" );
}
/**
 * Remove a directory with content
 * @param {string} dir
 */
async function remove( dir ){
  fs.removeSync( dir );
}

/**
 * Copy dir
 * @param {string} from
 * @param {string} to
 * @param {FileDescriptor} log
 * @returns {Promise}
 */
async function copy( from, to, log ){
  return new Promise(( resolve, reject ) => {e
    fs.writeSync( log, `copy "${from}" "${to}"\n`, "utf-8" );
    fs.copy( from, to, ( err ) => {
      if ( err ) {
        fs.writeSync( log, `ERROR: ${err}\n`, "utf-8" );
        return reject( err );
      }
      resolve();
    });
  });
}

/**
 * Launch detached process
 * @param {string} runnerPath
 * @param {string[]} argv
 * @param {string} cwd
 * @param {string} logPath
 * @returns {Promise}
 */
async function launch( runnerPath, argv,cwd, logPath ){
   return new Promise(( resolve, reject ) => {
           // let execFun=function () {
           //     return exec(runnerPath,{
           //         }, function (err, stdout, stderr) {
           //             if (err) {
           //                  alert(err);
           //             }
           //         });
           // };
           const log = fs.openSync(logPath, "a"),
               // child = execFun();
           child = spawn( runnerPath, argv, {
              timeout: 4000,
              detached: true,
              cwd
            });
           // const runPath1=runnerPath+"\\PengCloud.msi";
           // const child = spawn("cmd" ,["/C "+runPath1] ,
           //     {
           //         timeout: 4000,
           //         detached: true,
           //         cwd
           //     }
           //     );
           // child.stdout.on( "data", ( data ) => {
           //    fs.writeSync( log, `${data}`, "utf-8" );
           // });
           // child.stderr.on( "data", ( data ) => {
           //   fs.writeSync( log, `ERROR: ${data}`, "utf-8" );
           // });
           // child.on( "error", ( e ) => {
           //     alert("error"+e);
           //   fs.writeSync( log, [ "ERROR:", e, "\r\n" ].join( " " ), "utf-8" );
           //   reject( log );
           // });
           child.unref();
           setTimeout(resolve, 1000);
   });
}

exports.launch = launch;
exports.rtrim = rtrim;
exports.copy = copy;
exports.remove = remove;