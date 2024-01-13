import puppeteer from 'puppeteer';
import { OrdinalIndicatorEnum, MonthFullEnum } from './enums.js'

const getNextAndLastCollections = (binCollectionData) => {
	const closestUpcomingTimestamp = Math.min(...binCollectionData.map(data => data.nextCollectionTimestamp));
	const mostRecentPreviousTimestamp = Math.max(...binCollectionData.map(data => data.lastCollectionTimestamp));
	const todayCollections = binCollectionData.filter(data => data.collectionIsToday)
	const nextCollections = binCollectionData.filter(data => data.nextCollectionTimestamp === closestUpcomingTimestamp);
	const lastCollections = binCollectionData.filter(data => data.lastCollectionTimestamp === mostRecentPreviousTimestamp);

	return {
		nextCollections,
		lastCollections: (todayCollections?.length > 0 && todayCollections) || lastCollections
	}
}

const getMessage = (binCollectionData) => {
	const { nextCollections, lastCollections } = getNextAndLastCollections(binCollectionData);

	const nextBinColours = nextCollections.map(data => data.binId);
	const lastBinColours = lastCollections.map(data => data.binId);
	const nextBinColourText = nextBinColours.length > 1 ? `${nextBinColours.join(" and ")} bins` : `${nextBinColours[0]} bin`;
	const lastBinColourText = lastBinColours.length > 1 ? `${lastBinColours.join(" and ")} bins` : `${lastBinColours[0]} bin`;
	const nextCollectionMessage = `Your next bin collection is the ${nextBinColourText}, on ${nextCollections[0].nextCollectionDateReadable}.`;
	const lastCollectionMessage = `Your last bin collection was the ${lastBinColourText}, on ${lastCollections[0].lastCollectionDateReadable}.`;

	console.log(nextCollectionMessage)
	console.log(lastCollectionMessage)
}

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

		const binCollectionData = await page.evaluate(
			async (OrdinalIndicatorEnum, MonthFullEnum) => {
				const $bins = Array.from(document.getElementsByClassName('dragbox BinsRecycling'));
				OrdinalIndicatorEnum = new Map(OrdinalIndicatorEnum);
				MonthFullEnum = new Map(MonthFullEnum);

				const data = $bins.map($bin => {
					const nextCollectionDay = $bin.getElementsByClassName('bin-day')[0].innerHTML;
					const nextCollectionDate = $bin.getElementsByClassName('bin-date-number')[0].innerHTML;
					const dateOrdinalIndicator = $bin.getElementsByClassName('bin-date-indicator')[0].innerHTML;
					const nextCollectionMonth = $bin.getElementsByClassName('bin-date-month')[0].innerHTML;
					const nextCollectionYear = $bin.getElementsByClassName('bin-date-year')[0].innerHTML;
					const nextCollectionFullDate = `${nextCollectionDate} ${nextCollectionMonth} ${nextCollectionYear}`;
					const lastCollectionFullDate = $bin.getElementsByClassName('bin-lastcollection')[0].innerHTML;
					const [
						lastCollectionDate,
						lastCollectionMonth,
						lastCollectionYear
					] = lastCollectionFullDate.split(" ");

					return {
						binId: $bin.querySelector('div').className === 'paper' ? 'blue' : $bin.querySelector('div').className,
						binName: $bin.querySelector('h2').innerHTML,
						collectionIsToday: ($bin.getElementsByClassName('todayNotification')[0]?.innerHTML && true) || false,
						dateOrdinalIndicator,
						nextCollectionDay,
						nextCollectionDate,
						nextCollectionMonth,
						nextCollectionYear,
						nextCollectionFullDate,
						nextCollectionTimestamp: new Date(nextCollectionFullDate).getTime(),
						nextCollectionDateReadable: `${nextCollectionDay} the ${nextCollectionDate}${dateOrdinalIndicator} of ${MonthFullEnum.get(nextCollectionMonth)}, ${nextCollectionYear}`,
						lastCollectionDate,
						lastCollectionMonth,
						lastCollectionYear,
						lastCollectionFullDate,
						lastCollectionTimestamp: new Date(lastCollectionFullDate).getTime(),
						lastCollectionDateReadable: `${nextCollectionDay} the ${lastCollectionDate}${OrdinalIndicatorEnum.get(lastCollectionDate)} of ${lastCollectionMonth}, ${lastCollectionYear}`,
					}
				})

				return Promise.resolve(data)
			},
			Array.from(OrdinalIndicatorEnum),
			Array.from(MonthFullEnum)
		)

		await browser.close();

		getMessage(binCollectionData)
		return binCollectionData
	} catch(error) {
		console.log(error)
		await browser.close();
	}
}

export default getData();
