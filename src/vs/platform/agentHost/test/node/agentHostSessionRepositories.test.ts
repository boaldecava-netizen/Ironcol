/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IAgentHostGitService } from '../../common/agentHostGitService.js';
import { resolveSessionRepositories } from '../../node/agentHostSessionRepositories.js';
import { createNoopGitService } from '../common/sessionTestHelpers.js';

/**
 * Builds a typed {@link IAgentHostGitService} fake whose `getRepositoryRoot`
 * returns a canned repository root per working directory (keyed by URI
 * string), and `undefined` for any directory absent from the map (i.e. a
 * non-git directory). All other members delegate to the shared no-op fake.
 */
function createFakeGitService(repositoryRoots: ReadonlyMap<string, URI>): IAgentHostGitService {
	return {
		...createNoopGitService(),
		getRepositoryRoot: async (workingDirectory: URI) => repositoryRoots.get(workingDirectory.toString()),
	};
}

suite('agentHostSessionRepositories', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	test('dedupes working directories that resolve to the same repository root', async () => {
		const repositoryRoot = URI.file('/repos/app');
		const primaryDirectory = URI.file('/repos/app');
		const subdirectory = URI.file('/repos/app/packages/web');
		const gitService = createFakeGitService(new Map([
			[primaryDirectory.toString(), repositoryRoot],
			[subdirectory.toString(), repositoryRoot],
		]));

		const result = await resolveSessionRepositories([primaryDirectory, subdirectory], gitService);

		assert.deepStrictEqual(result, {
			gitRepositories: [repositoryRoot],
			nonGitDirectories: [],
		});
	});

	test('reports non-git directories and keeps unique roots in input order', async () => {
		const repositoryOne = URI.file('/repos/one');
		const repositoryTwo = URI.file('/repos/two');
		const gitDirectoryOne = URI.file('/repos/one');
		const nonGitDirectory = URI.file('/tmp/scratch');
		const gitDirectoryTwo = URI.file('/repos/two/src');
		const gitService = createFakeGitService(new Map([
			[gitDirectoryOne.toString(), repositoryOne],
			[gitDirectoryTwo.toString(), repositoryTwo],
		]));

		const result = await resolveSessionRepositories([gitDirectoryOne, nonGitDirectory, gitDirectoryTwo], gitService);

		assert.deepStrictEqual(result, {
			gitRepositories: [repositoryOne, repositoryTwo],
			nonGitDirectories: [nonGitDirectory],
		});
	});
});
