/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IChatSessionFileChange2 } from '../../../../../../workbench/contrib/chat/common/chatSessionsService.js';
import { ISessionFileChange } from '../../../../../services/sessions/common/session.js';
import { filterChangesToPrimaryWorkingDirectory } from '../../browser/agentHostSessionChangesets.js';

suite('AgentHostSessionChangesets', () => {
	ensureNoDisposablesAreLeakedInTestSuite();

	// Fixtures mirror what `changesetFileToChange` produces: an
	// `IChatSessionFileChange2` whose `uri` always identifies the file (even for
	// deletions, where `modifiedUri` is absent).
	function makeChange(uri: string, modifiedUri: string | undefined = uri): ISessionFileChange {
		return {
			uri: URI.parse(uri),
			modifiedUri: modifiedUri === undefined ? undefined : URI.parse(modifiedUri),
			originalUri: undefined,
			insertions: 1,
			deletions: 0,
		} satisfies IChatSessionFileChange2;
	}

	function uris(changes: readonly ISessionFileChange[]): string[] {
		return changes.map(change => (change as IChatSessionFileChange2).uri.toString());
	}

	suite('filterChangesToPrimaryWorkingDirectory', () => {
		test('(a) multi-root: keeps only changes under the primary working directory', () => {
			const changes = [
				makeChange('file:///repo/primary/src/a.ts'),
				makeChange('file:///repo/primary/deep/nested/b.ts'),
				makeChange('file:///repo/other/c.ts'),
			];

			const result = filterChangesToPrimaryWorkingDirectory(changes, ['file:///repo/primary', 'file:///repo/other']);

			assert.deepStrictEqual(uris(result), [
				'file:///repo/primary/src/a.ts',
				'file:///repo/primary/deep/nested/b.ts',
			]);
		});

		test('(b) single-root: returns the input list unchanged (same reference)', () => {
			const changes = [
				makeChange('file:///repo/primary/a.ts'),
				makeChange('file:///repo/other/b.ts'),
			];

			assert.strictEqual(filterChangesToPrimaryWorkingDirectory(changes, ['file:///repo/primary']), changes);
		});

		test('(b) undefined working directories: returns the input list unchanged', () => {
			const changes = [makeChange('file:///repo/primary/a.ts')];

			assert.strictEqual(filterChangesToPrimaryWorkingDirectory(changes, undefined), changes);
		});

		test('(b) empty working directories: returns the input list unchanged', () => {
			const changes = [makeChange('file:///repo/primary/a.ts')];

			assert.strictEqual(filterChangesToPrimaryWorkingDirectory(changes, []), changes);
		});

		test('(c) boundary: a change exactly at the primary directory is kept; a sibling with a shared prefix is excluded', () => {
			const changes = [
				makeChange('file:///repo/primary'),
				makeChange('file:///repo/primary/x.ts'),
				makeChange('file:///repo/primary-sibling/y.ts'),
			];

			const result = filterChangesToPrimaryWorkingDirectory(changes, ['file:///repo/primary', 'file:///repo/second']);

			assert.deepStrictEqual(uris(result), [
				'file:///repo/primary',
				'file:///repo/primary/x.ts',
			]);
		});

		test('deletions (no modifiedUri) are classified by their file uri', () => {
			const changes = [
				makeChange('file:///repo/primary/gone.ts', undefined),
				makeChange('file:///repo/other/gone.ts', undefined),
			];

			const result = filterChangesToPrimaryWorkingDirectory(changes, ['file:///repo/primary', 'file:///repo/other']);

			assert.deepStrictEqual(uris(result), ['file:///repo/primary/gone.ts']);
		});
	});
});
