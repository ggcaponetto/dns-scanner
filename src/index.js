const chalk = require('chalk');
const shell = require('shelljs');

console.log(chalk.blue('Starting DNS-Scanner'));

function dig(ip, counter){
  const digCommand = `dig ${ip[3]}.${ip[2]}.${ip[1]}.${ip[0]}.in-addr.arpa PTR`;
  console.log(chalk.blue(`digging ip ${ip[0]}.${ip[1]}.${ip[2]}.${ip[3]} (counter: ${counter}): ${digCommand}`));
  try {
    const child = shell.exec(digCommand, {
      async: false,
      silent: true,
      fatal: false
    });
    if(child.code !== 0){
      console.log(chalk.red(`Error performing ${digCommand}`), child.code)
    } else {
      // console.log(chalk.yellow(`${digCommand} output:`, child.stdout));
      let lines = child.stdout.split("\n");
      lines.forEach((line, index, array) => {
        if(
          line.startsWith(";; AUTHORITY SECTION:")
          || line.startsWith(";; ANSWER SECTION:")
        ){
          // console.log(chalk.yellow(`${digCommand} output:`, lines[index+1]));
          const tabs = lines[index+1].split('\t');
          tabs.forEach((tab, index, tabArray)=>{
            // console.log(chalk.white(`tab ${index}:`, tab));
            if(tab.startsWith("PTR")){
              const ptrParts = tabArray.slice(index + 1);
              console.log(chalk.white(`PTR:`, ptrParts));
            }
          })
        }
      })
    }
  }catch (e){
    console.log(chalk.red(`Error performing ${digCommand} (counter: ${counter})`))
  }
}

function run(options={mode: 'sequence'}){
  const scan = (minAddress, maxAddress, counter) => {
    console.log(chalk.white(`scan`), {minAddress, maxAddress, counter})
    let scanCount = counter;
    let totalIpV4Addresses = Math.pow(256, 4);
    let address_4 = minAddress;
    console.log(chalk.white(`scan`), {address_4})
    for(let i = address_4[3]; i >= minAddress[3] && i < maxAddress[3]; i++){
      let address_3 = [address_4[0], address_4[1], address_4[2], i]
      for(let i = address_3[2]; i >= minAddress[2] && i < maxAddress[2]; i++){
        let address_2 = [address_3[0], address_3[1], i, address_3[3]];
        for(let i = address_2[1]; i >= minAddress[1] && i < maxAddress[1]; i++){
          let address_1 = [address_2[0], i, address_2[2], address_2[3]];
          for(let i = address_1[0]; i >= minAddress[0] && i < maxAddress[0]; i++){
            let address_0 = [i, address_1[1], address_1[2], address_1[3]];
            scanCount++;
            let rawPercentage = ((scanCount/totalIpV4Addresses)*100);
            if(counter % 1 === 0){
              dig(address_0, scanCount);
            }
          }
        }
      }
    }
  }
  const getRandom = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  console.log(chalk.blue(`Scanning in ${options.mode} mode`));
  if(options.mode === "sequence"){
    let minAddress = options.data.minAddress;
    let maxAddress = options.data.maxAddress;
    scan(minAddress, maxAddress, 0)
  } else if(options.mode === "random"){
    const max = options.data.max;
    for(let i = 0; i < max; i++){
      const randomAddress = [
        getRandom(0, 255),
        getRandom(0, 255),
        getRandom(0, 255),
        getRandom(0, 255)
      ]
      scan(randomAddress, randomAddress, i)
    }
  }
  console.log(chalk.blue(`Scanned all addresses.`));
}

run({mode: "sequence", data: {
    minAddress: [85,119,0,250],
    maxAddress: [85,119,1,90]
  }})
// run({mode: "random", data: {max: 1000}})
