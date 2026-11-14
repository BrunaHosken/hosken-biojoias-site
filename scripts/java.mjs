import { existsSync, readdirSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
export function javaEnvironment(){
  const env={...process.env};
  if(existsSync('.tools')) {
    const folder=readdirSync('.tools').find(name=>name.startsWith('jdk-')&&existsSync(`.tools/${name}/Contents/Home/bin/java`));
    if(folder){env.JAVA_HOME=resolve('.tools',folder,'Contents/Home');env.PATH=`${env.JAVA_HOME}/bin${delimiter}${env.PATH}`;}
  }
  return env;
}
