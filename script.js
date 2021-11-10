const puppeteer = require('puppeteer');

const getData = async () => {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	try {
		await page.goto('https://apps.wigan.gov.uk/MyNeighbourhood/MyArea.aspx');

		const $textInput = await page.$('div#AddressSrch > input[type="text"]');
		await $textInput.type('WN74BD');
		await $textInput.press('Enter');

		await page.waitForSelector('div#AddressSrch > input[type="submit"]');

		const $submitButton = await page.$('div#AddressSrch > input[type="submit"]')
		await $submitButton.click();

		await page.waitForSelector('select#ContentPlaceHolder1_lstAddresses');

		const $selectInput = await page.$('select#ContentPlaceHolder1_lstAddresses');
		await $selectInput.select('UPRN010014058648');

		await page.waitForNavigation();

		const binData = await page.evaluate(async () => {
			const $bins = Array.from(document.getElementsByClassName('dragbox BinsRecycling'))

			return $bins.reduce((acc, $bin) => {
				const binColour = $bin.querySelector('div').className === 'paper' ? 'blue' : $bin.querySelector('div').className

				acc[binColour] = {
					name: $bin.querySelector('h2').innerHTML,
					day: $bin.getElementsByClassName('bin-day')[0].innerHTML,
					date: $bin.getElementsByClassName('bin-date-number')[0].innerHTML,
					indicator: $bin.getElementsByClassName('bin-date-indicator')[0].innerHTML,
					month: $bin.getElementsByClassName('bin-date-month')[0].innerHTML,
					year: $bin.getElementsByClassName('bin-date-year')[0].innerHTML,
					lastDate: $bin.getElementsByClassName('bin-lastcollection')[0].innerHTML
				}

				return acc
			}, {})
		})

		await browser.close();

		return binData
	} catch(error) {
		console.log(error)
		await browser.close();
	}
}

exports.getBinData = getData();
