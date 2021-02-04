const chalk = require('chalk');
console.log(chalk.blue('Starting DNS-Scanner'));

function run(){
  let lastAddress = [
    255,
    255,
    255,
    255
  ]
  let current = [
    0, 0, 0, 0
  ]
  let counter = 0;
  let totalIpV4Addresses = Math.pow(256, 4);
  for(let i = 0; i <= lastAddress[3]; i++){
    let address_3 = [current[0], current[1], current[2], i]
    for(let i = 0; i <= lastAddress[2]; i++){
      let address_2 = [address_3[0], address_3[1], i, address_3[3]];
      for(let i = 0; i <= lastAddress[1]; i++){
        let address_1 = [address_2[0], i, address_2[2], address_2[3]];
        for(let i = 0; i <= lastAddress[0]; i++){
          let address_0 = [i, address_1[1], address_1[2], address_1[3]];
          counter++;
          let rawPercentage = ((counter/totalIpV4Addresses)*100);
          if(counter % 100000 === 0){
            console.log(chalk.white(`Scanning address ${address_0[0]}.${address_0[1]}.${address_0[2]}.${address_0[3]} (${rawPercentage}%)`));
          }
        }
      }
    }
  }
  console.log(chalk.blue(`Scanned all addresses.`));
}
run();
