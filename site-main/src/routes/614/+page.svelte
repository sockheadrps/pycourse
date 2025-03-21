<script>
	// Add any necessary imports here
	import { onMount } from 'svelte';
	import Terminal2 from '../../components/Terminal2.svelte';
	import ListLink from '../../components/ListLink.svelte';
	import Important from '../../components/Important.svelte';
	import VerticalHighlight from '../../components/VerticalHighlight.svelte';
	import { ExternalLink } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	let cbus_reps = ['William P. DeMora', 'Beth Liston', 'Mike Dewine'];
</script>

<main>
	<h4 class="title">614 area representatives to ask about the fuckin schools</h4>
	<div class="area-container">
		<div class="list-container">
			<ListLink
				items={[
					{
						term: 'William P. DeMora - Ohio Senate District 25, Democrat,',
						definition: ' https://ohiosenate.gov/members/william-p-demora/contact'
					},
					{
						term: 'Beth Liston, Ohio Senate District 16, Democrat',
						definition: ' https://ohiosenate.gov/members/beth-liston/contact'
					},
					{
						term: 'Hearcel F. Craig Ohio Senate District 15, Democrat',
						definition: 'https://ohiosenate.gov/members/hearcel-craig/contact'
					},
					{
						term: 'Mike Dewine, Govna of dogshit policy, est. 2019',
						definition: 'https://governor.ohio.gov/contact'
					}
				]}
			/>
			<VerticalHighlight>
				<div class="link-container" style="display: flex; align-items: center; gap: 2rem;">
					<ExternalLink />
					<a href="https://www.legislature.ohio.gov/members/senate-directory"
						>Ohio Senate Directory</a
					>
				</div>
			</VerticalHighlight>
			<Important title="Tell them to stop being assholes">
				<p>If from columbus and not sure what to say, heres a brief premade template</p>
			</Important>
		</div>
	</div>

	<div class="area-container">
		<Terminal2>
			<div class="fade-section" in:fade={{ duration: 500 }}>
				Dear (William P. DeMora, Beth Liston, Hearcel Craig, Mike DeWine), <br /> <br />
			</div>
			<div class="fade-section" in:fade={{ duration: 500 }}>
				Is there any chance you guys can attempt to structure and maintain a minimum standard for
				educational systems for the youth in the Columbus area since we're losing the federal one?
				Defunding the system that holds public education to at least some degree of accountability,
				under the guise of wasted tax dollars, is absolutely retarded.<br /><br />
			</div>
			<div class="fade-section" in:fade={{ duration: 500 }}>
				While you're at it, could you also consider structuring an investigative committee to
				uncover the apparent blatant misuse of public funding on education? I too wonder how the
				fuck Columbus City Schools, the largest by attendees and by design of the division of public
				funds for education, the largest recipient of public education state funding, still has
				fucking schools without air conditioning, as well as failing building infrastructure.<br
				/><br />
			</div>
			<div class="fade-section" in:fade={{ duration: 500 }}>
				Also, how the fuck does Superintendent Angela Chapman have an annual salary contract for
				over a quarter million dollars, and kids are attending schools that are falling apart? There
				are several of the elementaries that have cockroach infestations, and we are rewarding the
				jackasses who run the school system, for their incompetence. The cumulative contract pay of
				the top 10 administrators in the school system over the past 2 years sums to over 4 million
				dollars. Thank you, and this is complete horse shit. Do your fucking job.
				<br /><br />
				YOUR NAME
			</div>
		</Terminal2>
	</div>
</main>

<style>
	main {
		padding: 1rem;
		margin: 2rem;
		font-size: 1.25rem;
	}

	h4 {
		all: unset;
		margin-bottom: 1rem;
		text-transform: capitalize;
	}

	.area-container {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.list-container {
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 600px) {
		main {
			padding: 0.5rem;
			margin: 1.5rem;
			margin-top: 8rem;
			font-size: 2rem;
		}

		.link-container {
			flex-direction: row;
			gap: 1rem;
		}
	}
</style>
